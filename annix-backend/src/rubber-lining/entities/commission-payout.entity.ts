export enum CommissionType {
  SALES_REP = "SALES_REP",
  AFFILIATE = "AFFILIATE",
}

export enum PayoutStatus {
  PENDING = "PENDING",
  HELD = "HELD",
  APPROVED = "APPROVED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export enum PayoutReleaseSource {
  BANK_RECON = "BANK_RECON",
  MANUAL = "MANUAL",
}

export class CommissionPayout {
  id: number;

  companyId: number;

  commissionType: string;

  salesRepId: number | null;

  affiliateId: number | null;

  invoiceId: number;

  customerId: number;

  customerName: string;

  invoiceNumber: string;

  invoiceTotal: number;

  commissionRate: number;

  commissionAmount: number;

  status: string;

  releaseSource: string;

  bankReconId: number | null;

  paidAt: Date | null;

  paidBy: string | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
