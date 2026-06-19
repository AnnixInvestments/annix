export enum MonthlyAccountType {
  PAYABLE = "PAYABLE",
  RECEIVABLE = "RECEIVABLE",
}

export enum MonthlyAccountStatus {
  DRAFT = "DRAFT",
  GENERATED = "GENERATED",
  PENDING_SIGNOFF = "PENDING_SIGNOFF",
  SIGNED_OFF = "SIGNED_OFF",
}

export class RubberMonthlyAccount {
  id: number;

  firebaseUid: string;

  periodYear: number;

  periodMonth: number;

  accountType: MonthlyAccountType;

  status: MonthlyAccountStatus;

  pdfPath: string | null;

  generatedAt: Date | null;

  generatedBy: string | null;

  snapshotData: Record<string, unknown> | null;

  createdAt: Date;

  updatedAt: Date;
}
