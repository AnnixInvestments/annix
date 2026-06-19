import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export class QcEnvironmentalRecord {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  recordDate: string;

  humidity: number;

  temperatureC: number;

  dewPointC: number | null;

  notes: string | null;

  recordedByName: string;

  recordedById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
