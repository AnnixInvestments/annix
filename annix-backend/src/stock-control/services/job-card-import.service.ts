import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ChatMessage } from "../../nix/ai-providers/claude-chat.provider";
import { JobCard, JobCardStatus } from "../entities/job-card.entity";
import {
  FieldMapping,
  ImportMappingConfig,
  JobCardImportMapping,
} from "../entities/job-card-import-mapping.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { CpoService } from "./cpo.service";
import { DrawingExtractionService } from "./drawing-extraction.service";

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

export interface JobCardImportResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  createdJobCardIds: number[];
}

const INVALID_LINE_ITEM_PATTERNS = [
  /^production\b/i,
  /^foreman?\s*sign/i,
  /^forman\s*sign/i,
  /^material\s*spec/i,
  /^job\s*comp(letion)?\s*date/i,
  /^completion\s*date/i,
  /^supervisor/i,
  /^quality\s*control/i,
  /^qc\s*sign/i,
  /^inspector/i,
  /^approved\s*by/i,
  /^checked\s*by/i,
  /^date$/i,
  /^signature$/i,
  /^sign$/i,
  /^remarks$/i,
  /^comments$/i,
  /^notes$/i,
];

function isValidLineItem(li: LineItemImportRow): boolean {
  const itemCode = (li.itemCode || "").trim();
  const description = (li.itemDescription || "").trim();
  const textsToCheck = [itemCode, description].filter(Boolean);

  if (textsToCheck.length === 0) {
    return false;
  }

  const isFormLabel = textsToCheck.some((text) =>
    INVALID_LINE_ITEM_PATTERNS.some((pattern) => pattern.test(text)),
  );
  if (isFormLabel) {
    return false;
  }

  const qty = li.quantity ? parseFloat(li.quantity) : null;
  const hasNoData = !description && !li.itemNo && !li.jtNo && (qty === null || Number.isNaN(qty));
  if (hasNoData && itemCode) {
    const looksLikeLabel = /^[A-Za-z\s]+$/.test(itemCode) && itemCode.length < 30;
    if (looksLikeLabel) {
      return false;
    }
  }

  return true;
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
    private readonly aiChatService: AiChatService,
    private readonly drawingExtractionService: DrawingExtractionService,
    @Inject(forwardRef(() => CpoService))
    private readonly cpoService: CpoService,
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
        (row as unknown[]).map((cell) => (cell === null || cell === undefined ? "" : String(cell))),
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

    const grid = this.buildGridFromPdfText(text);

    if (this.isLikelyDrawingPdf(grid, text)) {
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

    return { grid, documentNumber: extractedDocNumber };
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
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
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

  async importJobCards(companyId: number, rows: JobCardImportRow[]): Promise<JobCardImportResult> {
    const result: JobCardImportResult = {
      totalRows: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      createdJobCardIds: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.jobNumber || !row.jobName) {
        result.errors.push({ row: i + 1, message: "Job Number and Job Name are required" });
        continue;
      }

      try {
        const customFields =
          row.customFields && Object.keys(row.customFields).length > 0 ? row.customFields : null;

        const existing = await this.jobCardRepo.findOne({
          where: { jobNumber: row.jobNumber, companyId },
        });

        const fieldValues = {
          jcNumber: row.jcNumber || null,
          pageNumber: row.pageNumber || null,
          jobName: row.jobName,
          customerName: row.customerName || null,
          description: row.description || null,
          poNumber: row.poNumber || null,
          siteLocation: row.siteLocation || null,
          contactPerson: row.contactPerson || null,
          dueDate: row.dueDate || null,
          notes: row.notes || null,
          reference: row.reference || null,
          customFields,
        };

        if (existing) {
          Object.assign(existing, fieldValues);
          const saved = await this.jobCardRepo.save(existing);

          await this.lineItemRepo.delete({ jobCardId: saved.id });

          if (row.lineItems && row.lineItems.length > 0) {
            const merged = mergeNoteRowsIntoItems(row.lineItems);
            const validLineItems = merged.filter(isValidLineItem);
            const lineItemEntities = validLineItems.map((li, idx) =>
              this.lineItemRepo.create({
                jobCardId: saved.id,
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
            await this.lineItemRepo.save(lineItemEntities);
          }

          await this.cpoService.matchJobCardToCpo(companyId, saved.id).catch((err) => {
            this.logger.warn(
              `CPO matching failed for JC ${saved.id}: ${err instanceof Error ? err.message : "Unknown"}`,
            );
          });

          result.updated++;
          result.createdJobCardIds.push(saved.id);
        } else {
          const jobCard = this.jobCardRepo.create({
            jobNumber: row.jobNumber,
            ...fieldValues,
            status: JobCardStatus.DRAFT,
            companyId,
          });
          const saved = await this.jobCardRepo.save(jobCard);

          if (row.lineItems && row.lineItems.length > 0) {
            const merged = mergeNoteRowsIntoItems(row.lineItems);
            const validLineItems = merged.filter(isValidLineItem);
            const lineItemEntities = validLineItems.map((li, idx) =>
              this.lineItemRepo.create({
                jobCardId: saved.id,
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
            await this.lineItemRepo.save(lineItemEntities);
          }

          await this.cpoService.matchJobCardToCpo(companyId, saved.id).catch((err) => {
            this.logger.warn(
              `CPO matching failed for JC ${saved.id}: ${err instanceof Error ? err.message : "Unknown"}`,
            );
          });

          result.created++;
          result.createdJobCardIds.push(saved.id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors.push({ row: i + 1, message });
      }
    }

    return result;
  }
}
