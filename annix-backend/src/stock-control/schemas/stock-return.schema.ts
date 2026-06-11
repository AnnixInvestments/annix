import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockReturnDocument = HydratedDocument<StockReturn>;

@Schema({
  collection: "stock_returns",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockReturn {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  allocationId: number;

  @Prop({ type: Number, required: true })
  originalStockItemId: number;

  @Prop({ type: String, required: false })
  leftoverStockItemId: string;

  @Prop({ type: Number, required: true })
  litresReturned: number;

  @Prop({ type: Number, required: true })
  costReduction: number;

  @Prop({ type: String, required: false })
  returnedByName: string;

  @Prop({ type: String, required: false })
  returnedByStaffId: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const StockReturnSchema = SchemaFactory.createForClass(StockReturn);

StockReturnSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockReturnSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

StockReturnSchema.virtual("allocation", {
  ref: "StockAllocation",
  localField: "allocationId",
  foreignField: "_id",
  justOne: true,
});

StockReturnSchema.virtual("originalStockItem", {
  ref: "StockItem",
  localField: "originalStockItemId",
  foreignField: "_id",
  justOne: true,
});

StockReturnSchema.virtual("leftoverStockItem", {
  ref: "StockItem",
  localField: "leftoverStockItemId",
  foreignField: "_id",
  justOne: true,
});

StockReturnSchema.virtual("returnedByStaff", {
  ref: "StaffMember",
  localField: "returnedByStaffId",
  foreignField: "_id",
  justOne: true,
});

StockReturnSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
