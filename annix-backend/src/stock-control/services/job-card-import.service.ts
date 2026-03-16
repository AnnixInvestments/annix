import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ChatMessage } from "../../nix/ai-providers/claude-chat.provider";
import { CpoStatus } from "../entities/customer-purchase-order.entity";
import { CustomerPurchaseOrderItem } from "../entities/customer-purchase-order-item.entity";
import { JobCard, JobCardStatus, JobCardWorkflowStatus } from "../entities/job-card.entity";
import {
  FieldMapping,
  ImportMappingConfig,
  JobCardImportMapping,
} from "../entities/job-card-import-mapping.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { isValidLineItem } from "../lib/line-item-validation";
import { CpoService } from "./cpo.service";
import { DrawingExtractionService } from "./drawing-extraction.service";
import { JobCardVersionService } from "./job-card-version.service";

export interface LineItemImportRow {
  itemCode?: string;
  itemDescription?: string;
  itemNo?: string;
  quantity?: string;
  jtNo?: string;
  m2?: number;
  notes?: string;
}

export interface JobCardImportRow {
  jobNumber?: string;
  jcNumber?: string;
  pageNumber?: string;
  jobName?: string;
  customerName?: string;
  description?: string;
  poNumber?: string;
  siteLocation?: string;
  contactPerson?: string;
  dueDate?: string;
  notes?: string;
  reference?: string;
  customFields?: Record<string, string>;
  lineItems?: LineItemImportRow[];
}

export interface DeliveryLineMatch {
  deliveryItemId: number;
  deliveryItemDescription: string | null;
  deliveryItemCode: string | null;
  cpoItemId: number;
  cpoItemDescription: string | null;
  cpoItemCode: string | null;
  similarity: number;
  preSelected: boolean;
}

export interface DeliveryMatchResult {
  jobCardId: number;
  jtDnNumber: string;
  matches: DeliveryLineMatch[];
}

export interface JobCardImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  createdJobCardIds: number[];
  deliveryMatches: DeliveryMatchResult[];
}

const NOTE_ROW_PATTERN =
  /INT\s*:|EXT\s*:|R\/L|rubber|lining|lagging|shore|paint|blast|coat|primer|oxide|epoxy|polyurethane|zinc|silicate|nitrile|neoprene|butadiene/i;

function isNoteRow(li: LineItemImportRow): boolean {
  const itemCode = (li.itemCode || "").trim();
  if (!itemCode) return false;
  const description = (li.itemDescription || "").trim();
  const qty = li.quantity ? parseFloat(li.quantity) : null;
  const hasNoData = !description && !li.itemNo && !li.jtNo && (qty === null || Number.isNaN(qty));
  return hasNoData && NOTE_ROW_PATTERN.test(itemCode);
}

function mergeNoteRowsIntoItems(items: LineItemImportRow[]): LineItemImportRow[] {
  const result: LineItemImportRow[] = [];

  items.forEach((item) => {
    if (isNoteRow(item)) {
      const noteText = (item.itemCode || "").trim();
      if (result.length > 0) {
        const last = result[result.length - 1];
        last.notes = last.notes ? `${last.notes}\n${noteText}` : noteText;
      }
      return;
    }
    result.push({ ...item });
  });

  return result;
}

const SAGE_NOISE_PATTERNS: RegExp[] = [
  /^Date\s+Date\s+Date$/i,
  /Sage\s*200\s*Evolution\s*\(Registered\s*to\b[^)]*\)\s*\d{4}\/\d{2}\/\d{2}\s*\d{2}:\d{2}:\d{2}/i,
  /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}$/,
  /^POLYMER\s+LINING\s+SYSTEMS\s+JOB\s+CARD\s+AND\s+MATERIAL\s+MOVEMENT$/i,
  /^QTY\s+REQ\s+ROLL\/?/i,
  /^Item\s+Code\s+Item\s+Description\s+Item\s+No\s+Quantity/i,
  /^CUSTOMER\s+.+\s+Page\s+\d+\s+of\s+\d+$/i,
  /^ORDER\s+NO\b.*\bJOB\s+FILE\s+NO\b.*\bDoc\b/i,
  /^Sage\s*200\s*Evolution/i,
  /^\d{4}\/\d{2}\/\d{2}\s*\d{2}:\d{2}:\d{2}\s*$/,
];

export function sanitizeNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;

  const cleaned = notes
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      return !SAGE_NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
    })
    .join("\n")
    .trim();

  return cleaned || null;
}

const JT_DN_PATTERN = /(?:JT|DN|JT\/DN|JTDN)[\s\-#:]*([A-Z0-9-]+)/i;

function detectJtDnNumber(row: JobCardImportRow): string | null {
  const fieldsToCheck = [row.jcNumber, row.reference, row.notes, row.description].filter(
    Boolean,
  ) as string[];

  const fieldMatch = fieldsToCheck.reduce<string | null>((found, field) => {
    if (found) return found;
    const match = field.match(JT_DN_PATTERN);
    return match ? match[0].trim() : null;
  }, null);

  if (fieldMatch) return fieldMatch;

  const lineItemJtNumbers = (row.lineItems || [])
    .map((li) => (li.jtNo || "").trim())
    .filter(Boolean);

  const uniqueJtNumbers = [...new Set(lineItemJtNumbers)];

  if (uniqueJtNumbers.length === 1) {
    return uniqueJtNumbers[0];
  }

  if (uniqueJtNumbers.length > 1) {
    return uniqueJtNumbers[0];
  }

  return null;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function jaccardSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(tokenize(textA));
  const tokensB = new Set(tokenize(textB));

  if (tokensA.size === 0 && tokensB.size === 0) return 0;

  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;

  return union > 0 ? intersection / union : 0;
}

const PDF_GRID_EXTRACTION_PROMPT = `You are an expert at reading job cards, work orders, sales orders, and industrial documents from PDF files.

Look at this PDF document and extract ALL visible data into a 2D grid (array of arrays), exactly as it appears in the document layout.

Rules:
- Return ONLY a JSON array of arrays (e.g. [["Header1","Header2"],["val1","val2"]])
- Preserve the table structure exactly as shown in the document
- Include header rows
- Include ALL rows, even if some cells are empty (use "" for empty cells)
- If there are multiple tables/sections, include them all in sequence
- Include any metadata fields visible on the page (job number, customer, dates, etc.) as rows too
- Capture text exactly as shown - do not paraphrase or reformat values
- For fields shown as "Label: Value" pairs, output them as ["Label", "Value"]
- Return valid JSON only, no markdown fences or explanation`;

const JOB_CARD_MAPPING_PROMPT = `You are an expert at reading job cards and work orders. Given a grid of text extracted from a PDF or spreadsheet, identify where the job card fields are located.

Job cards typically have these fields:
- Job Number / Order Number / Sales Order - the main document identifier
- JC Number - job card sequence number (often shown as "JC: X" or separate from Job Number)
- Page Number - when job cards span multiple pages
- Job Name / Description - what the job is for
- Customer Name / Client
- PO Number - customer purchase order reference
- Site Location / Delivery Address
- Contact Person
- Due Date / Delivery Date
- Notes - special instructions, coating specs, etc.
- Reference - additional reference numbers

Line items typically appear in a table format with columns for:
- Item Code / Product Code
- Description
- Item No / Mark No
- Quantity / Qty
- JT No / Job Ticket

CRITICAL: The line items table ends AFTER all work items AND any coating/lining specification notes that follow them. Rows like "INT : R/L ..." or "EXT : BLAST & PAINT ..." that appear after line items are coating/lining specifications — they MUST be included in the line items range (set lineItemsEndRow to include them). Rows like "PRODUCTION", "Foreman Sign", "Forman Sign", "Material Spec", "Job Comp Date", "Completion Date", "Supervisor", "Quality Control", "Approved By", "Checked By" are form footer labels - they are NOT line items. Set lineItemsEndRow to include all work items and specification notes, but BEFORE any footer labels.

Analyze the grid and return JSON with this structure:
{
  "jobNumber": { "column": <col_index>, "row": <row_index> } or null,
  "jcNumber": { "column": <col_index>, "row": <row_index> } or null,
  "pageNumber": { "column": <col_index>, "row": <row_index> } or null,
  "jobName": { "column": <col_index>, "row": <row_index> } or null,
  "customerName": { "column": <col_index>, "row": <row_index> } or null,
  "poNumber": { "column": <col_index>, "row": <row_index> } or null,
  "siteLocation": { "column": <col_index>, "row": <row_index> } or null,
  "contactPerson": { "column": <col_index>, "row": <row_index> } or null,
  "dueDate": { "column": <col_index>, "row": <row_index> } or null,
  "notes": { "column": <col_index>, "row": <row_index> } or null,
  "reference": { "column": <col_index>, "row": <row_index> } or null,
  "lineItemsStartRow": <row_index where line items table starts>,
  "lineItemsEndRow": <row_index where line items table ends>,
  "lineItems": {
    "itemCode": { "column": <col_index> } or null,
    "itemDescription": { "column": <col_index> } or null,
    "itemNo": { "column": <col_index> } or null,
    "quantity": { "column": <col_index> } or null,
    "jtNo": { "column": <col_index> } or null
  }
}

Notes:
- Column and row indices are 0-based
- Look for label/value pairs - the label might be in an adjacent cell
- Line items usually have a header row followed by data rows
- If a field is not present, set it to null
- Return valid JSON only`;

@Injectable()
export class JobCardImportService {
  private readonly logger = new Logger(JobCardImportService.name);

  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    @InjectRepository(JobCardImportMapping)
    private readonly mappingRepo: Repository<JobCardImportMapping>,
    @InjectRepository(CustomerPurchaseOrderItem)
    private readonly cpoItemRepo: Repository<CustomerPurchaseOrderItem>,
    private readonly aiChatService: AiChatService,
    private readonly drawingExtractionService: DrawingExtractionService,
    @Inject(forwardRef(() => CpoService))
    private readonly cpoService: CpoService,
    private readonly versionService: JobCardVersionService,
  ) {}

  async parseFile(
    buffer: Buffer,
    mimetype: string,
    filename?: string,
  ): Promise<{ grid: string[][]; documentNumber?: string; drawingRows?: JobCardImportRow[] }> {
    const isExcel =
      mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimetype === "application/vnd.ms-excel" ||
      mimetype === "text/csv";

    if (isExcel) {
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const raw = xlsx.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });
      const grid = raw.map((row) =>
        (row as unknown[]).map((cell) => (cell == null ? "" : String(cell))),
      );
      return { grid };
    } else if (mimetype === "application/pdf") {
      return this.parsePdfFile(buffer, filename);
    }

    return { grid: [] };
  }

  private async parsePdfFile(
    buffer: Buffer,
    filename?: string,
  ): Promise<{ grid: string[][]; documentNumber?: string; drawingRows?: JobCardImportRow[] }> {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const text = data.text;

    const extractedDocNumber = this.extractDocumentNumber(filename, text);

    const textGrid = this.buildGridFromPdfText(text);

    if (this.isLikelyDrawingPdf(textGrid, text)) {
      this.logger.log(
        `PDF "${filename}" appears to be an engineering drawing, using vision extraction`,
      );
      const drawingRows = await this.extractDrawingAsImportRows(
        [{ buffer, filename: filename || "drawing.pdf" }],
        text,
        filename,
      );
      if (drawingRows.length > 0) {
        return { grid: [], documentNumber: extractedDocNumber, drawingRows };
      }
    }

    const aiGrid = await this.extractGridFromPdfWithAi(buffer);
    if (aiGrid.length > 1) {
      this.logger.log(`AI vision extracted ${aiGrid.length} rows from PDF "${filename}"`);
      return { grid: aiGrid, documentNumber: extractedDocNumber };
    }

    return { grid: textGrid, documentNumber: extractedDocNumber };
  }

  async parseDrawingPdfs(
    pdfBuffers: { buffer: Buffer; filename: string }[],
  ): Promise<{ drawingRows: JobCardImportRow[]; documentNumber?: string }> {
    const allText = await Promise.all(
      pdfBuffers.map(async ({ buffer }) => {
        const pdfParse = require("pdf-parse");
        const data = await pdfParse(buffer);
        return data.text as string;
      }),
    );
    const combinedText = allText.join("\n");
    const documentNumber = this.extractDocumentNumber(pdfBuffers[0]?.filename, combinedText);

    const drawingRows = await this.extractDrawingAsImportRows(pdfBuffers, combinedText);
    return { drawingRows, documentNumber };
  }

  private isLikelyDrawingPdf(grid: string[][], text: string): boolean {
    const nonEmptyCells = grid.reduce(
      (sum, row) => sum + row.filter((cell) => cell.trim().length > 0).length,
      0,
    );
    const hasDrawingKeywords =
      /drawing\s*no|drawn\s*by|checked\s*by|isometric|elevation|section|plan\s*view|tekla|general\s*arrangement|rubber\s*lin/i.test(
        text,
      );
    const hasJobCardKeywords =
      /job\s*card|work\s*order|item\s*code|item\s*description|qty|quantity/i.test(text);

    return hasDrawingKeywords && !hasJobCardKeywords && nonEmptyCells < 50;
  }

  private async extractGridFromPdfWithAi(buffer: Buffer): Promise<string[][]> {
    try {
      const base64 = buffer.toString("base64");
      const { content } = await this.aiChatService.chatWithImage(
        base64,
        "application/pdf",
        PDF_GRID_EXTRACTION_PROMPT,
      );

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger.warn("AI PDF grid extraction returned no JSON array");
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [];
      }

      const grid: string[][] = parsed.map((row: unknown) => {
        if (!Array.isArray(row)) return [];
        return row.map((cell: unknown) => (cell == null ? "" : String(cell)));
      });

      const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
      return grid.map((row) => {
        const padded = [...row];
        while (padded.length < maxCols) {
          padded.push("");
        }
        return padded;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`AI PDF grid extraction failed, falling back to text: ${message}`);
      return [];
    }
  }

  private async extractDrawingAsImportRows(
    pdfBuffers: { buffer: Buffer; filename: string }[],
    rawText: string,
    filename?: string,
  ): Promise<JobCardImportRow[]> {
    try {
      const result = await this.drawingExtractionService.extractFromPdfBuffers(pdfBuffers);
      return this.drawingResultToImportRows(result, rawText, filename);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Drawing extraction failed for import: ${message}`);
      return [];
    }
  }

  private drawingResultToImportRows(
    result: { drawingType: string; dimensions: any[]; tankData: any; confidence: number },
    rawText: string,
    filename?: string,
  ): JobCardImportRow[] {
    if (result.drawingType === "tank_chute" && result.tankData) {
      return this.tankResultToImportRows(result.tankData, rawText, filename);
    }

    if (result.dimensions.length === 0) {
      return [];
    }

    const refMatch = rawText.match(/(?:drawing\s*(?:no\.?|number)[:\s]*)([\w-]+)/i);
    const drawingRef = refMatch ? refMatch[1] : null;
    const jobNumber =
      drawingRef ||
      this.extractDocumentNumber(filename, rawText) ||
      filename?.replace(/\.pdf$/i, "") ||
      "DRAWING";

    const lineItems: LineItemImportRow[] = result.dimensions.map((dim: any) => ({
      itemCode: dim.itemType || null,
      itemDescription: dim.description,
      quantity: String(dim.quantity),
      m2: dim.externalSurfaceM2 ?? undefined,
    }));

    return [
      {
        jobNumber,
        jobName: jobNumber,
        description: `Extracted from drawing: ${filename || "PDF"}`,
        lineItems,
      },
    ];
  }

  private tankResultToImportRows(
    tankData: any,
    rawText: string,
    filename?: string,
  ): JobCardImportRow[] {
    const assemblyLabel =
      tankData.assemblyType.charAt(0).toUpperCase() + tankData.assemblyType.slice(1);
    const drawingRef = tankData.drawingReference;
    const jobNumber =
      drawingRef ||
      this.extractDocumentNumber(filename, rawText) ||
      filename?.replace(/\.pdf$/i, "") ||
      "DRAWING";
    const jobName = tankData.jobName || `${assemblyLabel} (${drawingRef || "Drawing"})`;

    const liningSpec = [
      tankData.liningType || null,
      tankData.liningThicknessMm ? `${tankData.liningThicknessMm}mm` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const lineItems: LineItemImportRow[] = [];
    const sections = Array.isArray(tankData.sections) ? tankData.sections : [];

    if (sections.length > 0) {
      sections.forEach((section: any) => {
        const sectionLabel = `Section ${section.mark}${section.description ? ` - ${section.description}` : ""}`;

        if (section.liningAreaM2 && section.liningAreaM2 > 0) {
          const desc = [`${assemblyLabel} ${sectionLabel} - R/L`, liningSpec || null]
            .filter(Boolean)
            .join(" - ");

          lineItems.push({
            itemCode: `R/L ${section.mark}`,
            itemDescription: desc,
            quantity: "1",
            m2: Math.round(section.liningAreaM2 * 100) / 100,
          });
        }

        if (section.coatingAreaM2 && section.coatingAreaM2 > 0) {
          const desc = [
            `${assemblyLabel} ${sectionLabel} - External Coating`,
            tankData.coatingSystem || null,
            tankData.surfacePrepStandard ? `Prep: ${tankData.surfacePrepStandard}` : null,
          ]
            .filter(Boolean)
            .join(" - ");

          lineItems.push({
            itemCode: `COAT ${section.mark}`,
            itemDescription: desc,
            quantity: "1",
            m2: Math.round(section.coatingAreaM2 * 100) / 100,
          });
        }
      });
    } else {
      if (tankData.liningAreaM2 && tankData.liningAreaM2 > 0) {
        lineItems.push({
          itemCode: drawingRef || "R/L",
          itemDescription: `${assemblyLabel} Internal Lining - ${liningSpec}`,
          quantity: "1",
          m2: Math.round(tankData.liningAreaM2 * 100) / 100,
        });
      }

      if (tankData.coatingAreaM2 && tankData.coatingAreaM2 > 0) {
        lineItems.push({
          itemCode: drawingRef || "COAT",
          itemDescription: `${assemblyLabel} External Coating`,
          quantity: "1",
          m2: Math.round(tankData.coatingAreaM2 * 100) / 100,
        });
      }
    }

    const notes = [
      tankData.overallLengthMm ? `L: ${tankData.overallLengthMm}mm` : null,
      tankData.overallWidthMm ? `W: ${tankData.overallWidthMm}mm` : null,
      tankData.overallHeightMm ? `H: ${tankData.overallHeightMm}mm` : null,
      tankData.liningType ? `Lining: ${tankData.liningType}` : null,
      tankData.liningThicknessMm ? `Thickness: ${tankData.liningThicknessMm}mm` : null,
      tankData.surfacePrepStandard ? `Prep: ${tankData.surfacePrepStandard}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    return [
      {
        jobNumber,
        jobName,
        description: `${assemblyLabel}${drawingRef ? ` (${drawingRef})` : ""}`,
        notes: notes || undefined,
        lineItems,
      },
    ];
  }

  private buildGridFromPdfText(text: string): string[][] {
    const lines = text.split("\n").filter((line: string) => line.trim().length > 0);

    const grid: string[][] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const cells = trimmed.split(/\s{2,}|\t/).map((cell) => cell.trim());

      if (cells.length === 1 && cells[0].length > 50) {
        const words = cells[0].split(/\s+/);
        const chunks: string[] = [];
        let current = "";
        words.forEach((word) => {
          if (current.length + word.length > 30) {
            if (current) chunks.push(current.trim());
            current = word;
          } else {
            current = current ? `${current} ${word}` : word;
          }
        });
        if (current) chunks.push(current.trim());
        grid.push(chunks);
      } else {
        grid.push(cells.filter((c) => c.length > 0));
      }
    });

    const maxCols = grid.reduce((max, row) => Math.max(max, row.length), 0);
    return grid.map((row) => {
      const padded = [...row];
      while (padded.length < maxCols) {
        padded.push("");
      }
      return padded;
    });
  }

  private extractDocumentNumber(filename?: string, text?: string): string | undefined {
    if (filename) {
      const filenameMatch = filename.match(/(?:SORDER|SO|JC|JOB)\s*([\w-]+)/i);
      if (filenameMatch) {
        return filenameMatch[1].trim();
      }
    }

    if (text) {
      const patterns = [
        /(?:sales\s*order|order\s*no\.?|order\s*number|document\s*no\.?)[:\s]*([A-Z0-9-]+)/i,
        /(?:so|ref)[:\s]*([A-Z0-9-]+)/i,
      ];
      const matched = patterns.reduce(
        (found: string | null, pattern) => found || (text.match(pattern)?.[1]?.trim() ?? null),
        null,
      );
      if (matched) return matched;
    }

    return undefined;
  }

  async mapping(companyId: number): Promise<JobCardImportMapping | null> {
    return this.mappingRepo.findOne({ where: { companyId } });
  }

  async saveMapping(companyId: number, config: ImportMappingConfig): Promise<JobCardImportMapping> {
    const existing = await this.mappingRepo.findOne({ where: { companyId } });

    if (existing) {
      existing.mappingConfig = config;
      return this.mappingRepo.save(existing);
    }

    const mapping = this.mappingRepo.create({
      companyId,
      mappingConfig: config,
    });
    return this.mappingRepo.save(mapping);
  }

  async autoDetectMapping(grid: string[][]): Promise<ImportMappingConfig> {
    this.logger.log(`Auto-detecting mapping for grid with ${grid.length} rows`);

    const gridSample = grid.slice(0, Math.min(50, grid.length));
    const gridText = gridSample
      .map(
        (row, rowIdx) =>
          `Row ${rowIdx}: ${row.map((cell, colIdx) => `[${colIdx}]"${cell}"`).join(" ")}`,
      )
      .join("\n");

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Analyze this job card grid and identify where each field is located:\n\n${gridText}\n\nRespond with JSON only.`,
      },
    ];

    try {
      const { content: response } = await this.aiChatService.chat(
        messages,
        JOB_CARD_MAPPING_PROMPT,
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn("AI response did not contain valid JSON, using defaults");
        return this.defaultMapping();
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return this.convertAiResponseToMappingConfig(parsed, grid.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Auto-detect mapping failed: ${message}`);
      return this.defaultMapping();
    }
  }

  private convertAiResponseToMappingConfig(
    aiResult: Record<string, unknown>,
    gridRowCount: number,
  ): ImportMappingConfig {
    const toFieldMapping = (
      val: unknown,
      defaultStartRow = 0,
      defaultEndRow = 0,
    ): FieldMapping | null => {
      if (!val || typeof val !== "object") return null;
      const obj = val as Record<string, unknown>;
      if (typeof obj.column !== "number" || typeof obj.row !== "number") return null;
      return {
        column: obj.column,
        startRow: obj.row,
        endRow: obj.row,
      };
    };

    const lineItemsStartRow =
      typeof aiResult.lineItemsStartRow === "number" ? aiResult.lineItemsStartRow : 0;
    const lineItemsEndRow =
      typeof aiResult.lineItemsEndRow === "number" ? aiResult.lineItemsEndRow : gridRowCount - 1;

    const lineItemsObj = (aiResult.lineItems || {}) as Record<string, unknown>;

    const toLineItemFieldMapping = (val: unknown): FieldMapping | null => {
      if (!val || typeof val !== "object") return null;
      const obj = val as Record<string, unknown>;
      if (typeof obj.column !== "number") return null;
      return {
        column: obj.column,
        startRow: lineItemsStartRow,
        endRow: lineItemsEndRow,
      };
    };

    return {
      jobNumber: toFieldMapping(aiResult.jobNumber),
      jcNumber: toFieldMapping(aiResult.jcNumber),
      pageNumber: toFieldMapping(aiResult.pageNumber),
      jobName: toFieldMapping(aiResult.jobName),
      customerName: toFieldMapping(aiResult.customerName),
      description: null,
      poNumber: toFieldMapping(aiResult.poNumber),
      siteLocation: toFieldMapping(aiResult.siteLocation),
      contactPerson: toFieldMapping(aiResult.contactPerson),
      dueDate: toFieldMapping(aiResult.dueDate),
      notes: toFieldMapping(aiResult.notes),
      reference: toFieldMapping(aiResult.reference),
      customFields: [],
      lineItems: {
        itemCode: toLineItemFieldMapping(lineItemsObj.itemCode),
        itemDescription: toLineItemFieldMapping(lineItemsObj.itemDescription),
        itemNo: toLineItemFieldMapping(lineItemsObj.itemNo),
        quantity: toLineItemFieldMapping(lineItemsObj.quantity),
        jtNo: toLineItemFieldMapping(lineItemsObj.jtNo),
      },
    };
  }

  private defaultMapping(): ImportMappingConfig {
    return {
      jobNumber: null,
      jcNumber: null,
      pageNumber: null,
      jobName: null,
      customerName: null,
      description: null,
      poNumber: null,
      siteLocation: null,
      contactPerson: null,
      dueDate: null,
      notes: null,
      reference: null,
      customFields: [],
      lineItems: {
        itemCode: null,
        itemDescription: null,
        itemNo: null,
        quantity: null,
        jtNo: null,
      },
    };
  }

  private buildLineItemEntities(
    lineItems: LineItemImportRow[],
    jobCardId: number,
    companyId: number,
  ): JobCardLineItem[] {
    const merged = mergeNoteRowsIntoItems(lineItems);
    const valid = merged.filter(isValidLineItem);
    return valid.map((li, idx) =>
      this.lineItemRepo.create({
        jobCardId,
        itemCode: li.itemCode || null,
        itemDescription: li.itemDescription || null,
        itemNo: li.itemNo || null,
        quantity: li.quantity ? parseFloat(li.quantity) : null,
        jtNo: li.jtNo || null,
        m2: li.m2 ?? null,
        notes: li.notes || null,
        sortOrder: idx,
        companyId,
      }),
    );
  }

  private async archiveAndOverwrite(
    existing: JobCard,
    row: JobCardImportRow,
    companyId: number,
  ): Promise<number> {
    await this.versionService.archiveCurrentVersion(
      companyId,
      existing.id,
      "Re-uploaded with same job number",
      null,
    );

    const customFields =
      row.customFields && Object.keys(row.customFields).length > 0 ? row.customFields : null;

    existing.jcNumber = row.jcNumber || null;
    existing.pageNumber = row.pageNumber || null;
    existing.jobName = row.jobName!;
    existing.customerName = row.customerName || null;
    existing.description = row.description || null;
    existing.poNumber = row.poNumber || null;
    existing.siteLocation = row.siteLocation || null;
    existing.contactPerson = row.contactPerson || null;
    existing.dueDate = row.dueDate || null;
    existing.notes = sanitizeNotes(row.notes);
    existing.reference = row.reference || null;
    existing.customFields = customFields;
    existing.versionNumber = existing.versionNumber + 1;

    const saved = await this.jobCardRepo.save(existing);

    await this.lineItemRepo.delete({ jobCardId: saved.id });

    if (row.lineItems && row.lineItems.length > 0) {
      const entities = this.buildLineItemEntities(row.lineItems, saved.id, companyId);
      await this.lineItemRepo.save(entities);
    }

    await this.versionService.resetWorkflow(companyId, saved.id);

    this.logger.log(
      `Archived and overwrote job card ${existing.jobNumber} as v${saved.versionNumber}`,
    );

    return saved.id;
  }

  private async createDeliveryJobCard(
    parentJobCard: JobCard,
    row: JobCardImportRow,
    jtDnNumber: string,
    companyId: number,
  ): Promise<{ jobCardId: number; deliveryMatch: DeliveryMatchResult | null }> {
    const customFields =
      row.customFields && Object.keys(row.customFields).length > 0 ? row.customFields : null;

    const deliveryJc = this.jobCardRepo.create({
      jobNumber: parentJobCard.jobNumber,
      jcNumber: jtDnNumber,
      pageNumber: row.pageNumber || null,
      jobName: row.jobName || parentJobCard.jobName,
      customerName: row.customerName || parentJobCard.customerName,
      description: row.description || null,
      poNumber: row.poNumber || parentJobCard.poNumber,
      siteLocation: row.siteLocation || parentJobCard.siteLocation,
      contactPerson: row.contactPerson || parentJobCard.contactPerson,
      dueDate: row.dueDate || null,
      notes: sanitizeNotes(row.notes),
      reference: row.reference || null,
      customFields,
      status: JobCardStatus.DRAFT,
      workflowStatus: JobCardWorkflowStatus.DRAFT,
      versionNumber: 1,
      parentJobCardId: parentJobCard.id,
      jtDnNumber,
      workflowCeiling: null,
      cpoId: parentJobCard.cpoId,
      isCpoCalloff: true,
      companyId,
    });

    const saved = await this.jobCardRepo.save(deliveryJc);

    if (row.lineItems && row.lineItems.length > 0) {
      const entities = this.buildLineItemEntities(row.lineItems, saved.id, companyId);
      await this.lineItemRepo.save(entities);
    }

    this.logger.log(
      `Created delivery JC ${parentJobCard.jobNumber} / ${jtDnNumber} linked to parent ${parentJobCard.id}`,
    );

    const deliveryMatch = await this.fuzzyMatchDeliveryItems(saved.id, parentJobCard, companyId);

    return { jobCardId: saved.id, deliveryMatch };
  }

  private async fuzzyMatchDeliveryItems(
    deliveryJobCardId: number,
    parentJobCard: JobCard,
    companyId: number,
  ): Promise<DeliveryMatchResult | null> {
    const deliveryLineItems = await this.lineItemRepo.find({
      where: { jobCardId: deliveryJobCardId, companyId },
      order: { sortOrder: "ASC" },
    });

    if (deliveryLineItems.length === 0 || !parentJobCard.cpoId) {
      return null;
    }

    const cpoItems = await this.cpoItemRepo.find({
      where: { cpoId: parentJobCard.cpoId, companyId },
      order: { sortOrder: "ASC" },
    });

    if (cpoItems.length === 0) {
      return null;
    }

    const deliveryJc = await this.jobCardRepo.findOne({
      where: { id: deliveryJobCardId },
    });

    const matches: DeliveryLineMatch[] = deliveryLineItems.flatMap((dli) => {
      const scored = cpoItems.map((cpoItem) => {
        const descSimilarity = jaccardSimilarity(
          dli.itemDescription || "",
          cpoItem.itemDescription || "",
        );

        const codeMatch =
          dli.itemCode &&
          cpoItem.itemCode &&
          dli.itemCode.trim().toLowerCase() === cpoItem.itemCode.trim().toLowerCase()
            ? 0.3
            : 0;

        const itemNoMatch =
          dli.itemNo &&
          cpoItem.itemNo &&
          dli.itemNo.trim().toLowerCase() === cpoItem.itemNo.trim().toLowerCase()
            ? 0.2
            : 0;

        const totalSimilarity = Math.min(1, descSimilarity * 0.5 + codeMatch + itemNoMatch);

        return { cpoItem, similarity: totalSimilarity };
      });

      const best = scored.reduce(
        (top, current) => (current.similarity > top.similarity ? current : top),
        scored[0],
      );

      if (best.similarity < 0.1) {
        return [];
      }

      return [
        {
          deliveryItemId: dli.id,
          deliveryItemDescription: dli.itemDescription,
          deliveryItemCode: dli.itemCode,
          cpoItemId: best.cpoItem.id,
          cpoItemDescription: best.cpoItem.itemDescription,
          cpoItemCode: best.cpoItem.itemCode,
          similarity: Math.round(best.similarity * 100) / 100,
          preSelected: best.similarity >= 0.4,
        },
      ];
    });

    if (matches.length === 0) {
      return null;
    }

    return {
      jobCardId: deliveryJobCardId,
      jtDnNumber: deliveryJc?.jtDnNumber || "",
      matches,
    };
  }

  async confirmDeliveryMatches(
    companyId: number,
    deliveryJobCardId: number,
    confirmedMatches: { deliveryItemId: number; cpoItemId: number }[],
  ): Promise<void> {
    const deliveryJc = await this.jobCardRepo.findOne({
      where: { id: deliveryJobCardId, companyId },
    });

    if (!deliveryJc || !deliveryJc.cpoId) {
      return;
    }

    await Promise.all(
      confirmedMatches.map(async ({ deliveryItemId, cpoItemId }) => {
        const deliveryItem = await this.lineItemRepo.findOne({
          where: { id: deliveryItemId, jobCardId: deliveryJobCardId },
        });
        const cpoItem = await this.cpoItemRepo.findOne({
          where: { id: cpoItemId, cpoId: deliveryJc.cpoId! },
        });

        if (!deliveryItem || !cpoItem) return;

        const deliveredQty = deliveryItem.quantity || 0;
        const newFulfilled = Math.min(
          Number(cpoItem.quantityFulfilled) + deliveredQty,
          Number(cpoItem.quantityOrdered),
        );

        await this.cpoItemRepo.update(cpoItemId, { quantityFulfilled: newFulfilled });
      }),
    );

    const cpo = await this.cpoService.findById(companyId, deliveryJc.cpoId);
    const totalFulfilled = (cpo.items || []).reduce(
      (sum, item) => sum + Number(item.quantityFulfilled),
      0,
    );

    const updateFields: Record<string, unknown> = { fulfilledQuantity: totalFulfilled };
    if (totalFulfilled >= Number(cpo.totalQuantity) && Number(cpo.totalQuantity) > 0) {
      updateFields.status = "fulfilled";
    }

    await this.cpoService.updateStatus(
      companyId,
      cpo.id,
      totalFulfilled >= Number(cpo.totalQuantity) && Number(cpo.totalQuantity) > 0
        ? CpoStatus.FULFILLED
        : cpo.status,
    );

    this.logger.log(
      `Confirmed ${confirmedMatches.length} delivery matches for JC ${deliveryJobCardId}`,
    );
  }

  async importJobCards(companyId: number, rows: JobCardImportRow[]): Promise<JobCardImportResult> {
    const result: JobCardImportResult = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      createdJobCardIds: [],
      deliveryMatches: [],
    };

    return rows.reduce(async (accPromise, row, i) => {
      const acc = await accPromise;

      if (!row.jobNumber || !row.jobName) {
        return {
          ...acc,
          errors: [...acc.errors, { row: i + 1, message: "Job Number and Job Name are required" }],
        };
      }

      try {
        const jtDnNumber = detectJtDnNumber(row);

        const existing = await this.jobCardRepo.findOne({
          where: { jobNumber: row.jobNumber, companyId, parentJobCardId: IsNull() },
          relations: ["lineItems"],
        });

        if (existing && jtDnNumber) {
          const { jobCardId, deliveryMatch } = await this.createDeliveryJobCard(
            existing,
            row,
            jtDnNumber,
            companyId,
          );

          return {
            ...acc,
            created: acc.created + 1,
            createdJobCardIds: [...acc.createdJobCardIds, jobCardId],
            deliveryMatches: deliveryMatch
              ? [...acc.deliveryMatches, deliveryMatch]
              : acc.deliveryMatches,
          };
        } else if (existing && !jtDnNumber) {
          const savedId = await this.archiveAndOverwrite(existing, row, companyId);

          await this.cpoService.matchJobCardToCpo(companyId, savedId).catch((err) => {
            this.logger.warn(
              `CPO matching failed for JC ${savedId}: ${err instanceof Error ? err.message : "Unknown"}`,
            );
          });

          return {
            ...acc,
            updated: acc.updated + 1,
            createdJobCardIds: [...acc.createdJobCardIds, savedId],
          };
        }

        const customFields =
          row.customFields && Object.keys(row.customFields).length > 0 ? row.customFields : null;

        const jobCard = this.jobCardRepo.create({
          jobNumber: row.jobNumber,
          jcNumber: row.jcNumber || null,
          pageNumber: row.pageNumber || null,
          jobName: row.jobName,
          customerName: row.customerName || null,
          description: row.description || null,
          poNumber: row.poNumber || null,
          siteLocation: row.siteLocation || null,
          contactPerson: row.contactPerson || null,
          dueDate: row.dueDate || null,
          notes: sanitizeNotes(row.notes),
          reference: row.reference || null,
          customFields,
          status: JobCardStatus.DRAFT,
          companyId,
        });
        const saved = await this.jobCardRepo.save(jobCard);

        if (row.lineItems && row.lineItems.length > 0) {
          const entities = this.buildLineItemEntities(row.lineItems, saved.id, companyId);
          await this.lineItemRepo.save(entities);
        }

        await this.cpoService.matchJobCardToCpo(companyId, saved.id).catch((err) => {
          this.logger.warn(
            `CPO matching failed for JC ${saved.id}: ${err instanceof Error ? err.message : "Unknown"}`,
          );
        });

        return {
          ...acc,
          created: acc.created + 1,
          createdJobCardIds: [...acc.createdJobCardIds, saved.id],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          ...acc,
          errors: [...acc.errors, { row: i + 1, message }],
        };
      }
    }, Promise.resolve(result));
  }
}
