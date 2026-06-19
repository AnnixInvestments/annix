import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class StockControlLocation {
  id: number;

  name: string;

  description: string | null;

  displayOrder: number | null;

  active: boolean;

  company: StockControlCompany;

  companyId: number;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
