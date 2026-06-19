import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class GlossaryTerm {
  id: number;

  abbreviation: string;

  term: string;

  definition: string;

  category: string | null;

  company: StockControlCompany;

  companyId: number;

  isCustom: boolean;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
