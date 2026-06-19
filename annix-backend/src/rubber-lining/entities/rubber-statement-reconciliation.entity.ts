import { RubberCompany } from "./rubber-company.entity";

export enum ReconciliationStatus {
  PENDING = "PENDING",
  EXTRACTING = "EXTRACTING",
  MATCHED = "MATCHED",
  DISCREPANCY = "DISCREPANCY",
  RESOLVED = "RESOLVED",
}

export interface ExtractedStatementLineItem {
  invoiceNumber: string;
  invoiceDate: string | null;
  amount: number;
  isCredit: boolean;
  balance: number | null;
}

export interface ReconciliationMatchSummary {
  matched: number;
  unmatched: number;
  discrepancies: number;
  // Phase-1 cascade audit counts — populated only for supplier
  // reconciliations. Older rows persisted before this field existed will
  // have undefined values; callers must handle both shapes.
  dnGaps?: number;
  cocGaps?: number;
}

export class RubberStatementReconciliation {
  id: number;

  firebaseUid: string;

  companyId: number;

  company: RubberCompany;

  periodYear: number;

  periodMonth: number;

  statementPath: string;

  originalFilename: string;

  extractedData: ExtractedStatementLineItem[] | null;

  status: ReconciliationStatus;

  matchSummary: ReconciliationMatchSummary | null;

  resolvedBy: string | null;

  resolvedAt: Date | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
