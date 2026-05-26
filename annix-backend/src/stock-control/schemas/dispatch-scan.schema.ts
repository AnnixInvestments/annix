import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DispatchScanDocument = HydratedDocument<DispatchScan>;

@Schema({
  collection: "dispatch_scans",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DispatchScan {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  stockItemId: number;

  @Prop({ type: String, required: false })
  allocationId: string;

  @Prop({ type: Number, required: true })
  quantityDispatched: number;

  @Prop({ type: String, required: false })
  scannedById: string;

  @Prop({ type: String, required: false })
  scannedByName: string;

  @Prop({ type: String, required: false })
  dispatchNotes: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedScannedById: string;

  @Prop({ type: String, required: false })
  scannedAt: string;
}

export const DispatchScanSchema = SchemaFactory.createForClass(DispatchScan);

DispatchScanSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

DispatchScanSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

DispatchScanSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

DispatchScanSchema.virtual("allocation", {
  ref: "StockAllocation",
  localField: "allocationId",
  foreignField: "_id",
  justOne: true,
});

DispatchScanSchema.virtual("scannedBy", {
  ref: "StockControlUser",
  localField: "scannedById",
  foreignField: "_id",
  justOne: true,
});

DispatchScanSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

DispatchScanSchema.virtual("unifiedScannedBy", {
  ref: "User",
  localField: "unifiedScannedById",
  foreignField: "_id",
  justOne: true,
});
