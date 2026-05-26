import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockTakeAdjustmentDocument = HydratedDocument<StockTakeAdjustment>;

@Schema({
  collection: "sm_stock_take_adjustment",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockTakeAdjustment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  stockTakeLineId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  adjustmentQty: number;

  @Prop({ type: Number, required: true })
  adjustmentValueR: number;

  @Prop({ type: Number, required: false })
  purchaseBatchId: number;

  @Prop({ type: String, required: false })
  postedAt: string;

  @Prop({ type: Number, required: false })
  postedByStaffId: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const StockTakeAdjustmentSchema = SchemaFactory.createForClass(StockTakeAdjustment);

StockTakeAdjustmentSchema.virtual("stockTakeLine", {
  ref: "StockTakeLine",
  localField: "stockTakeLineId",
  foreignField: "_id",
  justOne: true,
});

StockTakeAdjustmentSchema.virtual("purchaseBatch", {
  ref: "StockPurchaseBatch",
  localField: "purchaseBatchId",
  foreignField: "_id",
  justOne: true,
});
