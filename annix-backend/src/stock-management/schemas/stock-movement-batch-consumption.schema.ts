import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockMovementBatchConsumptionDocument = HydratedDocument<StockMovementBatchConsumption>;

@Schema({
  collection: "sm_stock_movement_batch_consumption",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockMovementBatchConsumption {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  purchaseBatchId: number;

  @Prop({ type: Number, required: true })
  productId: number;

  @Prop({ type: String, required: true })
  movementKind: string;

  @Prop({ type: Number, required: false })
  movementRefId: number;

  @Prop({ type: Number, required: true })
  quantityConsumed: number;

  @Prop({ type: Number, required: true })
  costPerUnitAtConsumption: number;

  @Prop({ type: Number, required: true })
  totalCostConsumedR: number;

  @Prop({ type: String, required: false })
  consumedAt: string;

  @Prop({ type: Number, required: false })
  consumedByStaffId: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const StockMovementBatchConsumptionSchema = SchemaFactory.createForClass(
  StockMovementBatchConsumption,
);

StockMovementBatchConsumptionSchema.virtual("purchaseBatch", {
  ref: "StockPurchaseBatch",
  localField: "purchaseBatchId",
  foreignField: "_id",
  justOne: true,
});

StockMovementBatchConsumptionSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
