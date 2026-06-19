import { RubberRollStock } from "./rubber-roll-stock.entity";

export enum RollIssuanceStatus {
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
  CANCELLED = "CANCELLED",
}

export class RubberRollIssuance {
  id: number;

  rollStockId: number;

  rollStock: RubberRollStock;

  issuedBy: string;

  issuedAt: Date;

  rollWeightAtIssueKg: number;

  totalEstimatedUsageKg: number | null;

  expectedReturnKg: number | null;

  photoPath: string | null;

  notes: string | null;

  status: RollIssuanceStatus;

  items: RubberRollIssuanceItem[];

  createdAt: Date;

  updatedAt: Date;
}

export class RubberRollIssuanceItem {
  id: number;

  issuanceId: number;

  issuance: RubberRollIssuance;

  jobCardId: number;

  jcNumber: string;

  jobName: string | null;

  lineItems: RubberRollIssuanceLineItem[];

  createdAt: Date;
}

export class RubberRollIssuanceLineItem {
  id: number;

  issuanceItemId: number;

  issuanceItem: RubberRollIssuanceItem;

  lineItemId: number;

  itemDescription: string | null;

  itemNo: string | null;

  quantity: number | null;

  m2: number | null;

  estimatedWeightKg: number | null;

  createdAt: Date;
}
