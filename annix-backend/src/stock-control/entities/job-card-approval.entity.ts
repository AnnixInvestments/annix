import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export class JobCardApproval {
  id: number;

  jobCard: JobCard;

  jobCardId: number;

  company: StockControlCompany;

  companyId: number;

  step: string;

  status: ApprovalStatus;

  approvedBy: StockControlUser | null;

  approvedById: number | null;

  approvedByName: string | null;

  signatureUrl: string | null;

  comments: string | null;

  rejectedReason: string | null;

  outcomeKey: string | null;

  approvedAt: Date | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedApprovedBy?: User | null;

  unifiedApprovedById?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
