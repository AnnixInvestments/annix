import { StockTakeLine } from "./stock-take-line.entity";

export type StockTakeStatus =
  | "draft"
  | "counting"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "posted"
  | "archived";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class StockTake {
  id: number;

  companyId: number;

  name: string;

  periodLabel: string | null;

  periodStart: string | null;

  periodEnd: string | null;

  status: StockTakeStatus;

  snapshotAt: Date | null;

  startedAt: Date;

  startedByStaffId: number | null;

  submittedAt: Date | null;

  submittedByStaffId: number | null;

  approvedAt: Date | null;

  approvedByStaffId: number | null;

  approverRole: string | null;

  rejectedAt: Date | null;

  rejectedByStaffId: number | null;

  rejectionReason: string | null;

  postedAt: Date | null;

  postedByStaffId: number | null;

  valuationBeforeR: number | null;

  valuationAfterR: number | null;

  totalVarianceR: number | null;

  totalVarianceAbsR: number | null;

  requiresEscalatedReview: boolean;

  requiresHighValueApproval: boolean;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;

  lines: StockTakeLine[];
}
