import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockTakeLineDocument = HydratedDocument<StockTakeLine>;

@Schema({
  collection: "sm_stock_take_line",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockTakeLine {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  stockTakeId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  productId: number;

  @Prop({ type: Number, required: false })
  locationId: number;

  @Prop({ type: Number, required: true })
  expectedQty: number;

  @Prop({ type: Number, required: true })
  expectedCostPerUnit: number;

  @Prop({ type: Number, required: true })
  expectedValueR: number;

  @Prop({ type: Number, required: false })
  countedQty: number;

  @Prop({ type: Date, required: false })
  countedAt: Date;

  @Prop({ type: Number, required: false })
  countedByStaffId: number;

  @Prop({ type: Number, required: false })
  expectedAtCountTime: number;

  @Prop({ type: Number, required: false })
  expectedAtSnapshot: number;

  @Prop({ type: [Number], required: false })
  inFlightMovementIds: number;

  @Prop({ type: Number, required: false })
  varianceQty: number;

  @Prop({ type: Number, required: false })
  varianceValueR: number;

  @Prop({ type: Number, required: false })
  varianceCategoryId: number;

  @Prop({ type: String, required: false })
  varianceReason: string;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: Boolean, required: true })
  resolved: boolean;

  @Prop({ type: Number, required: false })
  resolvedByStaffId: number;

  @Prop({ type: Date, required: false })
  resolvedAt: Date;

  @Prop({ type: String, required: false })
  resolutionNotes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const StockTakeLineSchema = SchemaFactory.createForClass(StockTakeLine);

StockTakeLineSchema.virtual("stockTake", {
  ref: "StockTake",
  localField: "stockTakeId",
  foreignField: "_id",
  justOne: true,
});

StockTakeLineSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

StockTakeLineSchema.virtual("varianceCategory", {
  ref: "StockTakeVarianceCategory",
  localField: "varianceCategoryId",
  foreignField: "_id",
  justOne: true,
});
