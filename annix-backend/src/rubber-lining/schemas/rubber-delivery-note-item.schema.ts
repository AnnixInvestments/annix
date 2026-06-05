import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberDeliveryNoteItemDocument = HydratedDocument<RubberDeliveryNoteItem>;

@Schema({
  collection: "rubber_delivery_note_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberDeliveryNoteItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: Number, required: true })
  deliveryNoteId: number;

  @Prop({ type: String, required: false })
  batchNumberStart: string;

  @Prop({ type: String, required: false })
  batchNumberEnd: string;

  @Prop({ type: Number, required: false })
  weightKg: number;

  @Prop({ type: String, required: false })
  rollNumber: string;

  @Prop({ type: Number, required: false })
  rollWeightKg: number;

  @Prop({ type: Number, required: false })
  widthMm: number;

  @Prop({ type: Number, required: false })
  thicknessMm: number;

  @Prop({ type: Number, required: false })
  lengthM: number;

  @Prop({ type: Object, required: true })
  linkedBatchIds: Record<string, unknown>;

  @Prop({ type: String, required: false })
  compoundType: string;

  @Prop({ type: String, required: true })
  itemCategory: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: false })
  quantity: number;

  @Prop({ type: Object, required: false })
  cocBatchNumbers: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  theoreticalWeightKg: number;

  @Prop({ type: Number, required: false })
  weightDeviationPct: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberDeliveryNoteItemSchema = SchemaFactory.createForClass(RubberDeliveryNoteItem);

RubberDeliveryNoteItemSchema.virtual("deliveryNote", {
  ref: "RubberDeliveryNote",
  localField: "deliveryNoteId",
  foreignField: "_id",
  justOne: true,
});
