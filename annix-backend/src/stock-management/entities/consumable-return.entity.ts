import { ReturnSession } from "./return-session.entity";

export type ConsumableReturnCondition = "usable" | "contaminated";

export class ConsumableReturn {
  id: number;

  returnSession: ReturnSession;

  returnSessionId: number;

  companyId: number;

  sourceIssuanceRowId: number | null;

  sourceProductId: number | null;

  quantityReturned: number;

  condition: ConsumableReturnCondition;

  batchNumber: string | null;

  photoUrl: string | null;

  notes: string | null;

  createdAt: Date;
}
