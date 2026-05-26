import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RequisitionItemDocument = HydratedDocument<RequisitionItem>;

@Schema({
  collection: "requisition_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RequisitionItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  requisitionId: number;

  @Prop({ type: String, required: false })
  stockItemId: string;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: false })
  area: string;

  @Prop({ type: Number, required: true })
  litresRequired: number;

  @Prop({ type: Number, required: true })
  packSizeLitres: number;

  @Prop({ type: Number, required: true })
  packsToOrder: number;

  @Prop({ type: Number, required: false })
  quantityRequired: number;

  @Prop({ type: Number, required: false })
  reorderQty: number;

  @Prop({ type: String, required: false })
  reqNumber: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  quantityReceived: number;

  @Prop({ type: Number, required: false })
  linkedDeliveryNoteId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;
}

export const RequisitionItemSchema = SchemaFactory.createForClass(RequisitionItem);

RequisitionItemSchema.virtual("requisition", {
  ref: "Requisition",
  localField: "requisitionId",
  foreignField: "_id",
  justOne: true,
});

RequisitionItemSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

RequisitionItemSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

RequisitionItemSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
