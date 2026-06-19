import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export class QcEnvironmentalBatchLink {
  id: number;

  company: StockControlCompany;

  companyId: number;

  batchAssignmentId: number;

  environmentalRecordId: number;

  activityDate: Date;

  pullRule: string;

  resolvedDate: Date;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;
}
