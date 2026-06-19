import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum QcCheckResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface BlastingCheck {
  blastProfileBatchNo: string | null;
  contaminationFree: QcCheckResult | null;
  sa25Grade: QcCheckResult | null;
  inspectorName: string | null;
}

export interface SolutionUsed {
  productName: string;
  typeBatch: string | null;
  result: QcCheckResult;
  inspectorName: string | null;
}

export interface LiningCheck {
  preCureLinedAsPerDrawing: QcCheckResult | null;
  preCureInspectorName: string | null;
  visualDefectInspection: QcCheckResult | null;
  visualDefectInspectorName: string | null;
}

export interface CureCycleRecord {
  cycleNumber: number;
  timeIn: string | null;
  timeOut: string | null;
  pressureBar: number | null;
}

export interface PaintingCheck {
  coat: "primer" | "intermediate" | "final";
  batchNumber: string | null;
  dftMicrons: number | null;
  result: QcCheckResult | null;
  inspectorName: string | null;
}

export interface FinalInspection {
  linedAsPerDrawing: QcCheckResult | null;
  visualInspection: QcCheckResult | null;
  testPlate: QcCheckResult | null;
  shoreHardness: number | null;
  sparkTest: QcCheckResult | null;
  sparkTestVoltagePerMm: number | null;
  inspectorName: string | null;
}

export class QcReleaseCertificate {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number | null;

  cpoId: number | null;

  certificateNumber: string | null;

  blastingCheck: BlastingCheck | null;

  solutionsUsed: SolutionUsed[];

  liningCheck: LiningCheck | null;

  cureCycles: CureCycleRecord[];

  paintingChecks: PaintingCheck[];

  finalInspection: FinalInspection | null;

  comments: string | null;

  certificateDate: string | null;

  finalApprovalName: string | null;

  finalApprovalSignatureUrl: string | null;

  finalApprovalDate: string | null;

  capturedByName: string;

  capturedById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
