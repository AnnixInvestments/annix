import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberPurchaseRequisitionItemDocument = HydratedDocument<RubberPurchaseRequisitionItem>;

@Schema({
  collection: "rubber_purchase_requisition_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberPurchaseRequisitionItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  requisitionId: number;

  @Prop({ type: String, required: true })
  itemType: string;

  @Prop({ type: Number, required: false })
  compoundStockId: number;

  @Prop({ type: Number, required: false })
  compoundCodingId: number;

  @Prop({ type: String, required: false })
  compoundName: string;

  @Prop({ type: Number, required: true })
  quantityKg: number;

  @Prop({ type: Number, required: true })
  quantityReceivedKg: number;

  @Prop({ type: Number, required: false })
  unitPrice: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const RubberPurchaseRequisitionItemSchema = SchemaFactory.createForClass(
  RubberPurchaseRequisitionItem,
);

RubberPurchaseRequisitionItemSchema.virtual("requisition", {
  ref: "RubberPurchaseRequisition",
  localField: "requisitionId",
  foreignField: "_id",
  justOne: true,
});
