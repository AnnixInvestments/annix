import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobCard, JobCardStatus } from "../entities/job-card.entity";
import { JobCardImportMapping } from "../entities/job-card-import-mapping.entity";

export interface JobCardImportRow {
  jobNumber?: string;
  jobName?: string;
  customerName?: string;
  description?: string;
}

export interface JobCardImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

@Injectable()
export class JobCardImportService {
  private readonly logger = new Logger(JobCardImportService.name);

  constructor(
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardImportMapping)
    private readonly mappingRepo: Repository<JobCardImportMapping>,
  ) {}

  async parseFile(
    buffer: Buffer,
    mimetype: string,
  ): Promise<{ headers: string[]; rawRows: Record<string, unknown>[] }> {
    const isExcel =
      mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimetype === "application/vnd.ms-excel" ||
      mimetype === "text/csv";

    if (isExcel) {
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(worksheet);
      const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
      return { headers, rawRows };
    } else if (mimetype === "application/pdf") {
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      const lines = data.text.split("\n").filter((line: string) => line.trim().length > 0);

      if (lines.length === 0) {
        return { headers: [], rawRows: [] };
      }

      const headerLine = lines[0];
      const headers = headerLine.split(/\t|,|;/).map((h: string) => h.trim());

      const rawRows = lines.slice(1).reduce(
        (acc: Record<string, unknown>[], line: string) => {
          const parts = line.split(/\t|,|;/).map((p: string) => p.trim());
          if (parts.length >= 2 && parts[0]) {
            const row: Record<string, unknown> = {};
            headers.forEach((header: string, idx: number) => {
              row[header] = parts[idx] || "";
            });
            return [...acc, row];
          }
          return acc;
        },
        [] as Record<string, unknown>[],
      );

      return { headers, rawRows };
    }

    return { headers: [], rawRows: [] };
  }

  async mapping(companyId: number): Promise<JobCardImportMapping | null> {
    return this.mappingRepo.findOne({ where: { companyId } });
  }

  async saveMapping(
    companyId: number,
    data: {
      jobNumberColumn: string;
      jobNameColumn: string;
      customerNameColumn?: string | null;
      descriptionColumn?: string | null;
    },
  ): Promise<JobCardImportMapping> {
    const existing = await this.mappingRepo.findOne({ where: { companyId } });

    if (existing) {
      existing.jobNumberColumn = data.jobNumberColumn;
      existing.jobNameColumn = data.jobNameColumn;
      existing.customerNameColumn = data.customerNameColumn ?? null;
      existing.descriptionColumn = data.descriptionColumn ?? null;
      return this.mappingRepo.save(existing);
    }

    const mapping = this.mappingRepo.create({
      companyId,
      jobNumberColumn: data.jobNumberColumn,
      jobNameColumn: data.jobNameColumn,
      customerNameColumn: data.customerNameColumn ?? null,
      descriptionColumn: data.descriptionColumn ?? null,
    });
    return this.mappingRepo.save(mapping);
  }

  async importJobCards(companyId: number, rows: JobCardImportRow[]): Promise<JobCardImportResult> {
    const result: JobCardImportResult = {
      totalRows: rows.length,
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.jobNumber || !row.jobName) {
        result.errors.push({ row: i + 1, message: "Job Number and Job Name are required" });
        continue;
      }

      try {
        const existing = await this.jobCardRepo.findOne({
          where: { jobNumber: row.jobNumber, companyId },
        });

        if (existing) {
          result.skipped++;
          continue;
        }

        const jobCard = this.jobCardRepo.create({
          jobNumber: row.jobNumber,
          jobName: row.jobName,
          customerName: row.customerName || null,
          description: row.description || null,
          status: JobCardStatus.DRAFT,
          companyId,
        });
        await this.jobCardRepo.save(jobCard);
        result.created++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        result.errors.push({ row: i + 1, message });
      }
    }

    return result;
  }
}
