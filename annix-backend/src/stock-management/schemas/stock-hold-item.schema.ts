import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockHoldItemDocument = HydratedDocument<StockHoldItem>;

@Schema({
  collection: "sm_stock_hold_item",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockHoldItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  stockTakeId: number;

  @Prop({ type: Number, required: true })
  productId: number;

  @Prop({ type: Number, required: false })
  quantity: number;

  @Prop({ type: Object, required: false })
  dimensionsJson: Record<string, unknown>;

  @Prop({ type: String, required: true })
  reason: string;

  @Prop({ type: String, required: true })
  reasonNotes: string;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: Number, required: true })
  flaggedByStaffId: number;

  @Prop({ type: String, required: false })
  flaggedAt: string;

  @Prop({ type: Number, required: true })
  writeOffValueR: number;

  @Prop({ type: Number, required: false })
  holdMovementId: number;

  @Prop({ type: String, required: true })
  dispositionStatus: string;

  @Prop({ type: String, required: false })
  dispositionAction: string;

  @Prop({ type: Number, required: false })
  dispositionByStaffId: number;

  @Prop({ type: Date, required: false })
  dispositionAt: Date;

  @Prop({ type: Number, required: false })
  dispositionRefId: number;

  @Prop({ type: String, required: false })
  dispositionNotes: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const StockHoldItemSchema = SchemaFactory.createForClass(StockHoldItem);

StockHoldItemSchema.virtual("stockTake", {
  ref: "StockTake",
  localField: "stockTakeId",
  foreignField: "_id",
  justOne: true,
});

StockHoldItemSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
