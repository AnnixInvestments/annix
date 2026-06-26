import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum AttachmentType {
  DRAWING = "drawing",
  QC_DOCUMENT = "qc_document",
  SPECIFICATION = "specification",
  OTHER = "other",
}

export enum ExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  ANALYSED = "analysed",
  FAILED = "failed",
}

export class JobCardAttachment {
  id: number;

  jobCard: JobCard;

  jobCardId: number;

  company: StockControlCompany;

  companyId: number;

  attachmentType: AttachmentType;

  filePath: string;

  originalFilename: string;

  fileSizeBytes: number;

  mimeType: string;

  extractionStatus: ExtractionStatus;

  extractedData: Record<string, unknown>;

  extractionError: string | null;

  extractedAt: Date | null;

  uploadedBy: string | null;

  notes: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
