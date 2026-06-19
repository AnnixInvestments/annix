import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum JobCardDocumentType {
  SCANNED_FORM = "scanned_form",
  SYSTEM_GENERATED = "system_generated",
  SUPPORTING = "supporting",
}

export class JobCardDocument {
  id: number;

  jobCard: JobCard;

  jobCardId: number;

  company: StockControlCompany;

  companyId: number;

  documentType: JobCardDocumentType;

  fileUrl: string;

  originalFilename: string | null;

  mimeType: string | null;

  fileSizeBytes: number | null;

  uploadedBy: StockControlUser | null;

  uploadedById: number | null;

  uploadedByName: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedUploadedBy?: User | null;

  unifiedUploadedById?: number | null;

  createdAt: Date;
}
