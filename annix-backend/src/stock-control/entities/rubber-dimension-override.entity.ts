import { Company } from "../../platform/entities/company.entity";
import { StockControlCompany } from "./stock-control-company.entity";

export class RubberDimensionOverride {
  id: number;

  companyId: number;

  company: StockControlCompany;

  itemType: string | null;

  nbMm: number | null;

  odMm: number | null;

  schedule: string | null;

  pipeLengthMm: number;

  flangeConfig: string | null;

  calculatedWidthMm: number;

  calculatedLengthMm: number;

  overrideWidthMm: number;

  overrideLengthMm: number;

  usageCount: number;

  lastUsedAt: Date;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
