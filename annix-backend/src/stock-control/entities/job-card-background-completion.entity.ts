import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class JobCardBackgroundCompletion {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCard: JobCard;

  jobCardId: number;

  stepKey: string;

  completedBy: StockControlUser | null;

  completedById: number | null;

  completedByName: string | null;

  completedAt: Date;

  notes: string | null;

  completionType: string;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedCompletedBy?: User | null;

  unifiedCompletedById?: number | null;

  createdAt: Date;
}
