import { IssuanceRow } from "./issuance-row.entity";

export type CoatTrackingType = "primer" | "intermediate" | "final" | "rubber_lining";

export class IssuanceItemCoatTracking {
  id: number;

  companyId: number;

  issuanceRowId: number;

  issuanceRow: IssuanceRow;

  jobCardId: number;

  lineItemId: number;

  coatType: CoatTrackingType;

  quantityIssued: number;

  createdAt: Date;
}
