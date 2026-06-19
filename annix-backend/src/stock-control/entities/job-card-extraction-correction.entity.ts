import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

export class JobCardExtractionCorrection {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCard: JobCard;

  jobCardId: number;

  customerName: string | null;

  fieldName: string;

  originalValue: string | null;

  correctedValue: string;

  correctedByUser: StockControlUser | null;

  correctedBy: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  unifiedCorrectedByUser?: User | null;

  unifiedCorrectedBy?: number | null;

  createdAt: Date;
}
