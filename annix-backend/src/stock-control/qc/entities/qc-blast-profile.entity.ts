import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export interface BlastProfileReadingEntry {
  itemNumber: number;
  reading: number;
}

export class QcBlastProfile {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  profileType: string;

  coatLabel: string | null;

  specMicrons: number;

  abrasiveBatchNumber: string | null;

  readings: BlastProfileReadingEntry[];

  averageMicrons: number | null;

  temperature: number | null;

  humidity: number | null;

  readingDate: string;

  capturedByName: string;

  capturedById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
