import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum DftCoatType {
  PRIMER = "primer",
  INTERMEDIATE = "intermediate",
  FINAL = "final",
}

export interface DftReadingEntry {
  itemNumber: number;
  reading: number;
}

export class QcDftReading {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  coatType: DftCoatType;

  paintProduct: string;

  batchNumber: string | null;

  specMinMicrons: number;

  specMaxMicrons: number;

  readings: DftReadingEntry[];

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
