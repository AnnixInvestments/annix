import { RubberDeliveryNote } from "./rubber-delivery-note.entity";

export class RubberDeliveryNoteItem {
  id: number;

  firebaseUid: string;

  deliveryNoteId: number;

  deliveryNote: RubberDeliveryNote;

  batchNumberStart: string | null;

  batchNumberEnd: string | null;

  weightKg: number | null;

  rollNumber: string | null;

  rollWeightKg: number | null;

  widthMm: number | null;

  thicknessMm: number | null;

  lengthM: number | null;

  linkedBatchIds: number[];

  compoundType: string | null;

  itemCategory: string;

  description: string | null;

  quantity: number | null;

  cocBatchNumbers: string[] | null;

  theoreticalWeightKg: number | null;

  weightDeviationPct: number | null;

  createdAt: Date;

  updatedAt: Date;
}
