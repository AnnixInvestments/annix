import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export class QcpCustomerPreference {
  id: number;

  company: StockControlCompany;

  companyId: number;

  customerName: string;

  customerEmail: string | null;

  planType: string;

  interventionDefaults: Record<number, string> | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
