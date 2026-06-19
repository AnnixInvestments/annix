import { ReconciliationItem } from "./reconciliation-item.entity";

export enum ReconciliationEventType {
  QA_RELEASE = "qa_release",
  POLYMER_DN = "polymer_dn",
  MPS_DN = "mps_dn",
  MANUAL_ADJUSTMENT = "manual_adjustment",
}

export class ReconciliationEvent {
  id: number;

  reconciliationItem: ReconciliationItem;

  reconciliationItemId: number;

  companyId: number;

  eventType: ReconciliationEventType;

  quantity: number;

  referenceNumber: string | null;

  performedByName: string;

  performedById: number | null;

  notes: string | null;

  createdAt: Date;
}
