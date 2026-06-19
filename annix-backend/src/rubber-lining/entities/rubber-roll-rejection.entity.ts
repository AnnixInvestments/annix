import { RubberRollStock } from "./rubber-roll-stock.entity";
import { RubberSupplierCoc } from "./rubber-supplier-coc.entity";

export enum RollRejectionStatus {
  PENDING_RETURN = "PENDING_RETURN",
  RETURNED = "RETURNED",
  REPLACEMENT_RECEIVED = "REPLACEMENT_RECEIVED",
  CLOSED = "CLOSED",
}

export class RubberRollRejection {
  id: number;

  firebaseUid: string;

  originalSupplierCocId: number;

  originalSupplierCoc: RubberSupplierCoc;

  rollNumber: string;

  rollStockId: number | null;

  rollStock: RubberRollStock | null;

  rejectionReason: string;

  rejectedBy: string;

  rejectedAt: Date;

  returnDocumentPath: string | null;

  replacementSupplierCocId: number | null;

  replacementSupplierCoc: RubberSupplierCoc | null;

  replacementRollNumber: string | null;

  status: RollRejectionStatus;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
