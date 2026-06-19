import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum DustDebrisResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface DustDebrisTestEntry {
  testNumber: number;
  quantity: number | null;
  sizeClass: number | null;
  location: string | null;
  coatingType: string | null;
  itemNumber: string | null;
  result: DustDebrisResult;
  testedAt: string | null;
}

export interface DustDebrisAcceptanceCriteria {
  maxQuantity: number;
  maxSizeClass: number;
}

export interface DustDebrisEnvironmentalConditions {
  temperatureC: number | null;
  humidityPercent: number | null;
}

export class QcDustDebrisTest {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  tests: DustDebrisTestEntry[];

  surfacePrepMethod: string | null;

  acceptanceCriteria: DustDebrisAcceptanceCriteria | null;

  environmentalConditions: DustDebrisEnvironmentalConditions | null;

  readingDate: string;

  capturedByName: string;

  capturedById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
