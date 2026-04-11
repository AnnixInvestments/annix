import type {
  IssuanceSessionKind,
  IssuanceSessionStatus,
} from "../entities/issuance-session.entity";

export interface ConsumableRowInput {
  rowType: "consumable";
  productId: number;
  jobCardId?: number | null;
  quantity: number;
  batchNumber?: string | null;
  notes?: string | null;
}

export interface PaintRowInput {
  rowType: "paint";
  productId: number;
  jobCardId?: number | null;
  litres: number;
  coverageM2?: number | null;
  coatCount?: number | null;
  coatingAnalysisId?: number | null;
  batchNumber?: string | null;
  cpoProRataSplit?: Record<string, number> | null;
  notes?: string | null;
}

export interface RubberRollRowInput {
  rowType: "rubber_roll";
  productId: number;
  jobCardId?: number | null;
  weightKgIssued: number;
  issuedWidthMm?: number | null;
  issuedLengthM?: number | null;
  issuedThicknessMm?: number | null;
  expectedReturnDimensions?: {
    widthMm?: number;
    lengthM?: number;
    thicknessMm?: number;
  } | null;
  notes?: string | null;
}

export interface SolutionRowInput {
  rowType: "solution";
  productId: number;
  jobCardId?: number | null;
  volumeL: number;
  concentrationPct?: number | null;
  batchNumber?: string | null;
  notes?: string | null;
}

export type IssuanceRowInput =
  | ConsumableRowInput
  | PaintRowInput
  | RubberRollRowInput
  | SolutionRowInput;

export interface CreateIssuanceSessionDto {
  sessionKind?: IssuanceSessionKind;
  issuerStaffId?: number | null;
  recipientStaffId?: number | null;
  cpoId?: number | null;
  jobCardIds?: number[] | null;
  notes?: string | null;
  rows: IssuanceRowInput[];
}

export interface IssuanceSessionFilters {
  status?: IssuanceSessionStatus;
  sessionKind?: IssuanceSessionKind;
  cpoId?: number;
  issuerStaffId?: number;
  recipientStaffId?: number;
  page?: number;
  pageSize?: number;
}
