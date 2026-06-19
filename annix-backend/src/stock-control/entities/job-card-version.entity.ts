import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class JobCardVersion {
  id: number;

  jobCard: JobCard;

  jobCardId: number;

  company: StockControlCompany;

  companyId: number;

  versionNumber: number;

  filePath: string | null;

  originalFilename: string | null;

  jobName: string;

  customerName: string | null;

  notes: string | null;

  lineItemsSnapshot: Record<string, unknown>[] | null;

  workflowStatus: string | null;

  approvalsSnapshot: Record<string, unknown>[] | null;

  amendmentNotes: string | null;

  createdBy: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
