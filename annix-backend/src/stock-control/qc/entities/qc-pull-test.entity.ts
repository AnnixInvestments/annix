import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum PullTestResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface PullTestSolution {
  product: string;
  batchNumber: string | null;
  result: PullTestResult;
}

export interface ForceGaugeInfo {
  make: string;
  certificateNumber: string | null;
  expiryDate: string | null;
}

export interface PullTestAreaReading {
  area: string;
  result: PullTestResult;
  reading: string;
}

export class QcPullTest {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number;

  itemDescription: string | null;

  quantity: number | null;

  solutions: PullTestSolution[];

  forceGauge: ForceGaugeInfo;

  areaReadings: PullTestAreaReading[];

  comments: string | null;

  readingDate: string;

  finalApprovalName: string | null;

  finalApprovalDate: string | null;

  capturedByName: string;

  capturedById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
