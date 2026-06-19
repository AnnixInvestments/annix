import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class StockControlSupplier {
  id: number;

  company: StockControlCompany;

  companyId: number;

  name: string;

  vatNumber: string | null;

  registrationNumber: string | null;

  address: string | null;

  contactPerson: string | null;

  phone: string | null;

  email: string | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
