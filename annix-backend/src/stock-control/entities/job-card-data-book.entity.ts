import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class JobCardDataBook {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCard: JobCard;

  jobCardId: number;

  filePath: string;

  originalFilename: string;

  fileSizeBytes: number;

  generatedAt: Date;

  generatedByName: string | null;

  certificateCount: number;

  isStale: boolean;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
