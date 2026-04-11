import type { IssuableProductDto } from "./products";

export type IssuanceSessionStatus =
  | "active"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "undone";

export type IssuanceSessionKind = "standard" | "cpo_batch" | "rubber_roll" | "mixed";

export type IssuanceRowType = "consumable" | "paint" | "rubber_roll" | "solution";

export interface ConsumableRowInputDto {
  rowType: "consumable";
  productId: number;
  jobCardId?: number | null;
  quantity: number;
  batchNumber?: string | null;
  notes?: string | null;
}

export interface PaintRowInputDto {
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

export interface RubberRollRowInputDto {
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

export interface SolutionRowInputDto {
  rowType: "solution";
  productId: number;
  jobCardId?: number | null;
  volumeL: number;
  concentrationPct?: number | null;
  batchNumber?: string | null;
  notes?: string | null;
}

export type IssuanceRowInputDto =
  | ConsumableRowInputDto
  | PaintRowInputDto
  | RubberRollRowInputDto
  | SolutionRowInputDto;

export interface CreateIssuanceSessionDto {
  sessionKind?: IssuanceSessionKind;
  issuerStaffId?: number | null;
  recipientStaffId?: number | null;
  cpoId?: number | null;
  jobCardIds?: number[] | null;
  notes?: string | null;
  rows: IssuanceRowInputDto[];
}

export interface IssuanceRowDto {
  id: number;
  sessionId: number;
  rowType: IssuanceRowType;
  productId: number;
  jobCardId: number | null;
  undone: boolean;
  notes: string | null;
  createdAt: string;
  product: IssuableProductDto;
  consumable: { quantity: number; batchNumber: string | null } | null;
  paint: {
    litres: number;
    coverageM2: number | null;
    coatCount: number | null;
    batchNumber: string | null;
    cpoProRataSplit: Record<string, number> | null;
  } | null;
  rubberRoll: {
    weightKgIssued: number;
    issuedWidthMm: number | null;
    issuedLengthM: number | null;
    issuedThicknessMm: number | null;
    status: string;
  } | null;
  solution: {
    volumeL: number;
    concentrationPct: number | null;
    batchNumber: string | null;
  } | null;
}

export interface IssuanceSessionDto {
  id: number;
  companyId: number;
  sessionKind: IssuanceSessionKind;
  status: IssuanceSessionStatus;
  issuerStaffId: number | null;
  recipientStaffId: number | null;
  cpoId: number | null;
  jobCardIds: number[] | null;
  notes: string | null;
  approvedAt: string | null;
  approvedByStaffId: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  undoneAt: string | null;
  createdAt: string;
  updatedAt: string;
  rows: IssuanceRowDto[];
}

export interface IssuanceSessionListResultDto {
  items: IssuanceSessionDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IssuanceSessionFiltersDto {
  status?: IssuanceSessionStatus;
  sessionKind?: IssuanceSessionKind;
  cpoId?: number;
  issuerStaffId?: number;
  recipientStaffId?: number;
  page?: number;
  pageSize?: number;
}
