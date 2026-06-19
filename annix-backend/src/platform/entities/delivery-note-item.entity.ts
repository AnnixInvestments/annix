import { PlatformDeliveryNote } from "./delivery-note.entity";

export class DeliveryNoteItem {
  id: number;

  deliveryNoteId: number;

  deliveryNote: PlatformDeliveryNote;

  description: string | null;

  quantity: number | null;

  quantityReceived: number | null;

  stockItemId: number | null;

  photoUrl: string | null;

  rollNumber: string | null;

  batchNumberStart: string | null;

  batchNumberEnd: string | null;

  weightKg: number | null;

  rollWeightKg: number | null;

  widthMm: number | null;

  thicknessMm: number | null;

  lengthM: number | null;

  compoundType: string | null;

  itemCategory: string;

  linkedBatchIds: number[];

  cocBatchNumbers: string[] | null;

  theoreticalWeightKg: number | null;

  weightDeviationPct: number | null;

  firebaseUid: string | null;

  legacyScItemId: number | null;

  legacyRubberItemId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
