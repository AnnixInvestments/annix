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

    const grid = this.buildGridFromPdfText(text);
    return { grid, documentNumber: extractedDocNumber };
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
