import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class StockControlDepartment {
  id: number;

  name: string;

  displayOrder: number | null;

  active: boolean;

  company: StockControlCompany;

  companyId: number;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
