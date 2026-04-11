export type StockTakeStatus =
  | "draft"
  | "counting"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "posted"
  | "archived";

export interface StockTakeLineDto {
  id: number;
  stockTakeId: number;
  productId: number;
  locationId: number | null;
  expectedQty: number;
  expectedCostPerUnit: number;
  expectedValueR: number;
  countedQty: number | null;
  countedAt: string | null;
  countedByStaffId: number | null;
  varianceQty: number | null;
  varianceValueR: number | null;
  varianceCategoryId: number | null;
  varianceReason: string | null;
  photoUrl: string | null;
  resolved: boolean;
  product?: {
    id: number;
    sku: string;
    name: string;
    productType: string;
  };
}

export interface StockTakeDto {
  id: number;
  companyId: number;
  name: string;
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: StockTakeStatus;
  snapshotAt: string | null;
  startedAt: string;
  startedByStaffId: number | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedByStaffId: number | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  postedAt: string | null;
  valuationBeforeR: number | null;
  valuationAfterR: number | null;
  totalVarianceR: number | null;
  totalVarianceAbsR: number | null;
  requiresEscalatedReview: boolean;
  requiresHighValueApproval: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: StockTakeLineDto[];
}
