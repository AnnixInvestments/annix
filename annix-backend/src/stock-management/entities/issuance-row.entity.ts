import { ConsumableIssuanceRow } from "./consumable-issuance-row.entity";
import { IssuableProduct } from "./issuable-product.entity";
import { IssuanceSession } from "./issuance-session.entity";
import { PaintIssuanceRow } from "./paint-issuance-row.entity";
import { RubberRollIssuanceRow } from "./rubber-roll-issuance-row.entity";
import { SolutionIssuanceRow } from "./solution-issuance-row.entity";

export type IssuanceRowType = "consumable" | "paint" | "rubber_roll" | "solution";

export class IssuanceRow {
  id: number;

  session: IssuanceSession;

  sessionId: number;

  companyId: number;

  rowType: IssuanceRowType;

  product: IssuableProduct;

  productId: number;

  jobCardId: number | null;

  undone: boolean;

  undoneAt: Date | null;

  undoneByStaffId: number | null;

  notes: string | null;

  createdAt: Date;

  consumable?: ConsumableIssuanceRow | null;

  paint?: PaintIssuanceRow | null;

  rubberRoll?: RubberRollIssuanceRow | null;

  solution?: SolutionIssuanceRow | null;
}
