import { ReturnSession } from "./return-session.entity";

export type PaintReturnCondition = "usable" | "contaminated";

export class PaintReturn {
  id: number;

  returnSession: ReturnSession;

  returnSessionId: number;

  companyId: number;

  sourceIssuanceRowId: number | null;

  sourceProductId: number | null;

  litresReturned: number;

  condition: PaintReturnCondition;

  batchNumber: string | null;

  photoUrl: string | null;

  notes: string | null;

  createdAt: Date;
}
