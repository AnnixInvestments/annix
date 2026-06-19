import { IssuanceRow } from "./issuance-row.entity";

export type IssuanceSessionKind = "standard" | "cpo_batch" | "rubber_roll" | "mixed";

export type IssuanceSessionStatus =
  | "active"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "undone";

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | number | null) => (value === null ? null : Number(value)),
};

export class IssuanceSession {
  id: number;

  companyId: number;

  sessionKind: IssuanceSessionKind;

  status: IssuanceSessionStatus;

  issuerStaffId: number | null;

  recipientStaffId: number | null;

  cpoId: number | null;

  jobCardIds: number[] | null;

  notes: string | null;

  approvalThresholdValueR: number | null;

  approvedAt: Date | null;

  approvedByStaffId: number | null;

  rejectedAt: Date | null;

  rejectedByStaffId: number | null;

  rejectionReason: string | null;

  undoneAt: Date | null;

  undoneByStaffId: number | null;

  legacySessionId: number | null;

  createdAt: Date;

  updatedAt: Date;

  rows: IssuanceRow[];
}
