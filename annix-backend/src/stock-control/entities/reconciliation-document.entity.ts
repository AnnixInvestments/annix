import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export enum ReconciliationDocCategory {
  JT_DN = "jt_dn",
  SALES_ORDER = "sales_order",
  CPO = "cpo",
  DRAWING = "drawing",
  POLYMER_DN = "polymer_dn",
  MPS_DN = "mps_dn",
}

export enum ExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface ExtractedLineItem {
  itemDescription: string;
  itemCode: string | null;
  quantity: number;
  referenceNumber: string | null;
}

export class ReconciliationDocument {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  documentCategory: ReconciliationDocCategory;

  filePath: string;

  originalFilename: string;

  mimeType: string | null;

  fileSizeBytes: number | null;

  uploadedById: number | null;

  uploadedByName: string | null;

  extractionStatus: ExtractionStatus;

  extractedItems: ExtractedLineItem[] | null;

  extractionError: string | null;

  extractedAt: Date | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
