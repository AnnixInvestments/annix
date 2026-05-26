import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DeliveryNoteItemDocument = HydratedDocument<DeliveryNoteItem>;

@Schema({
  collection: "delivery_note_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DeliveryNoteItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  quantityReceived: number;

  @Prop({ type: String, required: false })
  rollNumber: string;

  @Prop({ type: Number, required: false })
  weightKg: number;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Number, required: false })
  deliveryNoteId: number;

  @Prop({ type: Number, required: false })
  stockItemId: number;
}

export const DeliveryNoteItemSchema = SchemaFactory.createForClass(DeliveryNoteItem);

DeliveryNoteItemSchema.virtual("deliveryNote", {
  ref: "DeliveryNote",
  localField: "deliveryNoteId",
  foreignField: "_id",
  justOne: true,
});

DeliveryNoteItemSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

DeliveryNoteItemSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

DeliveryNoteItemSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
