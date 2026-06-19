import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export interface ShoreHardnessReadings {
  column1: number[];
  column2: number[];
  column3: number[];
  column4: number[];
  itemLabels?: string[];
}

export interface ShoreHardnessAverages {
  column1: number | null;
  column2: number | null;
  column3: number | null;
  column4: number | null;
  overall: number | null;
}

export class QcShoreHardness {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  rubberSpec: string;

  rubberBatchNumber: string | null;

  requiredShore: number;

  readings: ShoreHardnessReadings;

  averages: ShoreHardnessAverages;

  readingDate: string;

  capturedByName: string;

  capturedById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
