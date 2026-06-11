import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockPriceHistoryDocument = HydratedDocument<StockPriceHistory>;

@Schema({
  collection: "stock_price_history",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockPriceHistory {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  stockItemId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  oldPrice: number;

  @Prop({ type: Number, required: true })
  newPrice: number;

  @Prop({ type: String, required: true })
  changeReason: string;

  @Prop({ type: String, required: false })
  referenceType: string;

  @Prop({ type: Number, required: false })
  referenceId: number;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: String, required: false })
  changedBy: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedChangedBy: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Number, required: false })
  changedByUserId: number;

  @Prop({ type: Number, required: false })
  unifiedChangedByUserId: number;
}

export const StockPriceHistorySchema = SchemaFactory.createForClass(StockPriceHistory);

StockPriceHistorySchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

StockPriceHistorySchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockPriceHistorySchema.virtual("changedByUser", {
  ref: "StockControlUser",
  localField: "changedByUserId",
  foreignField: "_id",
  justOne: true,
});

StockPriceHistorySchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

StockPriceHistorySchema.virtual("unifiedChangedByUser", {
  ref: "User",
  localField: "unifiedChangedByUserId",
  foreignField: "_id",
  justOne: true,
});
