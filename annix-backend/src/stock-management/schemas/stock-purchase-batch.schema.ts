import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockPurchaseBatchDocument = HydratedDocument<StockPurchaseBatch>;

@Schema({
  collection: "sm_stock_purchase_batch",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockPurchaseBatch {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  productId: number;

  @Prop({ type: String, required: true })
  sourceType: string;

  @Prop({ type: Number, required: false })
  sourceRefId: number;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: String, required: false })
  supplierBatchRef: string;

  @Prop({ type: Number, required: true })
  quantityPurchased: number;

  @Prop({ type: Number, required: true })
  quantityRemaining: number;

  @Prop({ type: Number, required: true })
  costPerUnit: number;

  @Prop({ type: Number, required: true })
  totalCostR: number;

  @Prop({ type: Date, required: true })
  receivedAt: Date;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Boolean, required: true })
  isLegacyBatch: boolean;

  @Prop({ type: Number, required: false })
  createdByStaffId: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const StockPurchaseBatchSchema = SchemaFactory.createForClass(StockPurchaseBatch);

StockPurchaseBatchSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
