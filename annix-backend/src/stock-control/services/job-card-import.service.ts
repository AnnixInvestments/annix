import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCard, JobCardStatus } from "../entities/job-card.entity";
import {
  ImportMappingConfig,
  JobCardImportMapping,
} from "../entities/job-card-import-mapping.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";

export interface LineItemImportRow {
  itemCode?: string;
  itemDescription?: string;
  itemNo?: string;
  quantity?: string;
  jtNo?: string;
  m2?: number;
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
  ) {}

  async parseFile(
    buffer: Buffer,
    mimetype: string,
    filename?: string,
  ): Promise<{ grid: string[][]; documentNumber?: string }> {
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
  ): Promise<{ grid: string[][]; documentNumber?: string }> {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const text = data.text;

    const extractedDocNumber = this.extractDocumentNumber(filename, text);

    const parsed = this.parseJobCardPdf(text);

    if (parsed.jobNumber || parsed.jobName || parsed.lineItems.length > 0) {
      return this.buildGridFromParsedPdf(parsed, extractedDocNumber);
    }

    const lines = text.split("\n").filter((line: string) => line.trim().length > 0);
    const grid = lines.map((line: string) =>
      line.split(/\t|,|;/).map((cell: string) => cell.trim()),
    );
    return { grid, documentNumber: extractedDocNumber };
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

  private parseJobCardPdf(text: string): {
    jobNumber: string | null;
    jcNumber: string | null;
    jobName: string | null;
    customerName: string | null;
    description: string | null;
    poNumber: string | null;
    siteLocation: string | null;
    contactPerson: string | null;
    dueDate: string | null;
    notes: string | null;
    reference: string | null;
    lineItems: Array<{
      itemCode: string | null;
      itemDescription: string | null;
      itemNo: string | null;
      quantity: string | null;
      jtNo: string | null;
    }>;
  } {
    const result = {
      jobNumber: null as string | null,
      jcNumber: null as string | null,
      jobName: null as string | null,
      customerName: null as string | null,
      description: null as string | null,
      poNumber: null as string | null,
      siteLocation: null as string | null,
      contactPerson: null as string | null,
      dueDate: null as string | null,
      notes: null as string | null,
      reference: null as string | null,
      lineItems: [] as Array<{
        itemCode: string | null;
        itemDescription: string | null;
        itemNo: string | null;
        quantity: string | null;
        jtNo: string | null;
      }>,
    };

    const fieldPatterns: Array<{ key: keyof typeof result; patterns: RegExp[] }> = [
      {
        key: "jobNumber",
        patterns: [
          /(?:job\s*(?:no\.?|number|#)|jc\s*(?:no\.?|number)|project\s*(?:no\.?|number))[:\s]*([A-Z0-9-]+)/i,
        ],
      },
      {
        key: "jcNumber",
        patterns: [/(?:jc\s*(?:no\.?|number|#))[:\s]*([A-Z0-9-]+)/i],
      },
      {
        key: "jobName",
        patterns: [
          /(?:job\s*name|project\s*name|job\s*title|description)[:\s]*([^\n\r]+?)(?=\s*(?:customer|client|date|po|site|$))/i,
        ],
      },
      {
        key: "customerName",
        patterns: [
          /(?:customer|client|sold\s*to|bill\s*to)[:\s]*([^\n\r]+?)(?=\s*(?:job|project|date|po|site|address|$))/i,
        ],
      },
      {
        key: "poNumber",
        patterns: [/(?:po\s*(?:no\.?|number|#)|purchase\s*order)[:\s]*([A-Z0-9-]+)/i],
      },
      {
        key: "siteLocation",
        patterns: [
          /(?:site|location|delivery\s*address|ship\s*to)[:\s]*([^\n\r]+?)(?=\s*(?:date|contact|phone|$))/i,
        ],
      },
      {
        key: "contactPerson",
        patterns: [
          /(?:contact|contact\s*person|attention|attn)[:\s]*([^\n\r]+?)(?=\s*(?:phone|tel|email|date|$))/i,
        ],
      },
      {
        key: "dueDate",
        patterns: [
          /(?:due\s*date|delivery\s*date|required\s*date|date\s*required)[:\s]*([0-9/-]+(?:\s*[0-9:]+)?)/i,
        ],
      },
      {
        key: "reference",
        patterns: [
          /(?:ref(?:erence)?|our\s*ref|your\s*ref)[:\s]*([A-Z0-9-]+)/i,
          /(?:sales\s*order|order\s*no\.?)[:\s]*([A-Z0-9-]+)/i,
        ],
      },
    ];

    fieldPatterns.forEach(({ key, patterns }) => {
      if (key === "lineItems") return;
      patterns.forEach((pattern) => {
        if (!result[key as keyof Omit<typeof result, "lineItems">]) {
          const match = text.match(pattern);
          if (match?.[1]) {
            (result[key as keyof Omit<typeof result, "lineItems">] as string | null) =
              match[1].trim();
          }
        }
      });
    });

    result.lineItems = this.extractLineItems(text);

    return result;
  }

  private extractLineItems(text: string): Array<{
    itemCode: string | null;
    itemDescription: string | null;
    itemNo: string | null;
    quantity: string | null;
    jtNo: string | null;
  }> {
    const items: Array<{
      itemCode: string | null;
      itemDescription: string | null;
      itemNo: string | null;
      quantity: string | null;
      jtNo: string | null;
    }> = [];

    const lines = text.split("\n");

    const itemPatterns = [
      /^(\d+)\s+([A-Z0-9-]+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(?:pcs?|ea|units?)?$/i,
      /^([A-Z0-9-]+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(?:pcs?|ea|units?)?$/i,
      /^\s*(\d+)\s*\.\s*(.+?)\s+(\d+(?:\.\d+)?)\s*$/i,
    ];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) return;

      itemPatterns.forEach((pattern) => {
        const match = trimmed.match(pattern);
        if (match) {
          if (match.length >= 5) {
            items.push({
              itemNo: match[1] || null,
              itemCode: match[2] || null,
              itemDescription: match[3]?.trim() || null,
              quantity: match[4] || null,
              jtNo: null,
            });
          } else if (match.length >= 4) {
            items.push({
              itemNo: null,
              itemCode: match[1] || null,
              itemDescription: match[2]?.trim() || null,
              quantity: match[3] || null,
              jtNo: null,
            });
          }
        }
      });
    });

    return items;
  }

  private buildGridFromParsedPdf(
    parsed: ReturnType<JobCardImportService["parseJobCardPdf"]>,
    documentNumber?: string,
  ): { grid: string[][]; documentNumber?: string } {
    const grid: string[][] = [];

    grid.push([
      "Job Number",
      "JC Number",
      "Job Name",
      "Customer",
      "Description",
      "PO Number",
      "Site/Location",
      "Contact",
      "Due Date",
      "Reference",
      "Item Code",
      "Item Description",
      "Item No",
      "Quantity",
      "JT No",
    ]);

    const jobNumber = parsed.jobNumber || documentNumber || "";

    if (parsed.lineItems.length > 0) {
      parsed.lineItems.forEach((item, index) => {
        grid.push([
          index === 0 ? jobNumber : "",
          index === 0 ? parsed.jcNumber || "" : "",
          index === 0 ? parsed.jobName || "" : "",
          index === 0 ? parsed.customerName || "" : "",
          index === 0 ? parsed.description || "" : "",
          index === 0 ? parsed.poNumber || "" : "",
          index === 0 ? parsed.siteLocation || "" : "",
          index === 0 ? parsed.contactPerson || "" : "",
          index === 0 ? parsed.dueDate || "" : "",
          index === 0 ? parsed.reference || documentNumber || "" : "",
          item.itemCode || "",
          item.itemDescription || "",
          item.itemNo || "",
          item.quantity || "",
          item.jtNo || "",
        ]);
      });
    } else {
      grid.push([
        jobNumber,
        parsed.jcNumber || "",
        parsed.jobName || "",
        parsed.customerName || "",
        parsed.description || "",
        parsed.poNumber || "",
        parsed.siteLocation || "",
        parsed.contactPerson || "",
        parsed.dueDate || "",
        parsed.reference || documentNumber || "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }

    return { grid, documentNumber };
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
            const lineItemEntities = row.lineItems.map((li, idx) =>
              this.lineItemRepo.create({
                jobCardId: saved.id,
                itemCode: li.itemCode || null,
                itemDescription: li.itemDescription || null,
                itemNo: li.itemNo || null,
                quantity: li.quantity ? parseFloat(li.quantity) : null,
                jtNo: li.jtNo || null,
                m2: li.m2 ?? null,
                sortOrder: idx,
                companyId,
              }),
            );
            await this.lineItemRepo.save(lineItemEntities);
          }

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
            const lineItemEntities = row.lineItems.map((li, idx) =>
              this.lineItemRepo.create({
                jobCardId: saved.id,
                itemCode: li.itemCode || null,
                itemDescription: li.itemDescription || null,
                itemNo: li.itemNo || null,
                quantity: li.quantity ? parseFloat(li.quantity) : null,
                jtNo: li.jtNo || null,
                m2: li.m2 ?? null,
                sortOrder: idx,
                companyId,
              }),
            );
            await this.lineItemRepo.save(lineItemEntities);
          }

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
