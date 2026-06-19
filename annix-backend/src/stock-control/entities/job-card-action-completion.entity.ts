import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class JobCardActionCompletion {
  id: number;

  jobCard: JobCard;

  jobCardId: number;

  company: StockControlCompany;

  companyId: number;

  stepKey: string;

  actionType: string;

  completedBy: StockControlUser | null;

  completedById: number;

  completedByName: string;

  completedAt: Date;

  metadata: Record<string, unknown> | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedCompletedBy?: User | null;

  unifiedCompletedById?: number | null;

  createdAt: Date;
}
