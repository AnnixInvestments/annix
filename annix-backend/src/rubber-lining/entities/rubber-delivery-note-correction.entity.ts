import { RubberDeliveryNote } from "./rubber-delivery-note.entity";

export class RubberDeliveryNoteCorrection {
  id: number;

  deliveryNote: RubberDeliveryNote;

  deliveryNoteId: number;

  supplierName: string | null;

  fieldName: string;

  originalValue: string | null;

  correctedValue: string;

  correctedBy: string | null;

  createdAt: Date;
}
