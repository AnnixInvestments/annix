import { ConsumableReturn } from "./consumable-return.entity";
import { PaintReturn } from "./paint-return.entity";
import { RubberOffcutReturn } from "./rubber-offcut-return.entity";

export type ReturnSessionKind =
  | "rubber_offcut"
  | "paint_litres"
  | "consumable_qty"
  | "solution_volume"
  | "other";

export type ReturnSessionStatus = "pending" | "confirmed" | "rejected" | "cancelled";

export class ReturnSession {
  id: number;

  companyId: number;

  returnKind: ReturnSessionKind;

  targetIssuanceRowId: number | null;

  targetSessionId: number | null;

  targetJobCardId: number | null;

  returnedByStaffId: number | null;

  confirmedByStaffId: number | null;

  status: ReturnSessionStatus;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;

  offcutReturns: RubberOffcutReturn[];

  paintReturns: PaintReturn[];

  consumableReturns: ConsumableReturn[];
}
