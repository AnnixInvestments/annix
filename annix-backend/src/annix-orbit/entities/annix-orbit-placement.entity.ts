export const ORBIT_PLACEMENT_STATUSES = [
  "offer_accepted",
  "started",
  "guarantee",
  "completed",
  "fall_off",
] as const;
export type AnnixOrbitPlacementStatus = (typeof ORBIT_PLACEMENT_STATUSES)[number];

export const ORBIT_PLACEMENT_INVOICE_STATUSES = ["not_invoiced", "invoiced", "paid"] as const;
export type AnnixOrbitPlacementInvoiceStatus = (typeof ORBIT_PLACEMENT_INVOICE_STATUSES)[number];

export class AnnixOrbitPlacement {
  id: number;

  companyId: number;

  // Consultant credited with this placement — drives the dashboard
  // Top-Consultants leaderboard + revenue attribution (issue #362).
  // Stamped to the creating user; null on pre-attribution rows.
  consultantUserId: number | null;

  clientId: number | null;

  candidateName: string;

  jobTitle: string;

  salary: number | null;

  placementFee: number | null;

  startDate: string | null;

  guaranteeUntil: string | null;

  status: AnnixOrbitPlacementStatus;

  invoiceStatus: AnnixOrbitPlacementInvoiceStatus;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
