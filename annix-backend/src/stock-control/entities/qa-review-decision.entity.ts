import { Company } from "../../platform/entities/company.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class QaReviewDecision {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCard: JobCard;

  jobCardId: number;

  cycleNumber: number;

  rubberApplicable: boolean;

  paintApplicable: boolean;

  rubberAccepted: boolean | null;

  paintAccepted: boolean | null;

  reviewedById: number | null;

  reviewedByName: string | null;

  reviewedAt: Date;

  notes: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
