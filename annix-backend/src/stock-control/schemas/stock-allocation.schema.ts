import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockAllocationDocument = HydratedDocument<StockAllocation>;

@Schema({
  collection: "stock_allocations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockAllocation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  stockItemId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  quantityUsed: number;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  allocatedBy: string;

  @Prop({ type: String, required: false })
  staffMemberId: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Boolean, required: true })
  pendingApproval: boolean;

  @Prop({ type: Number, required: false })
  allowedLitres: number;

  @Prop({ type: String, required: false })
  approvedByManagerId: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: Date, required: false })
  rejectedAt: Date;

  @Prop({ type: String, required: false })
  rejectionReason: string;

  @Prop({ type: Boolean, required: true })
  undone: boolean;

  @Prop({ type: Date, required: false })
  undoneAt: Date;

  @Prop({ type: String, required: false })
  undoneByName: string;

  @Prop({ type: Number, required: false })
  packCount: number;

  @Prop({ type: Number, required: false })
  litresPerPack: number;

  @Prop({ type: Number, required: false })
  totalLitres: number;

  @Prop({ type: String, required: true })
  allocationType: string;

  @Prop({ type: Date, required: false })
  issuedAt: Date;

  @Prop({ type: String, required: false })
  issuedByName: string;

  @Prop({ type: String, required: false })
  sourceLeftoverItemId: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const StockAllocationSchema = SchemaFactory.createForClass(StockAllocation);

StockAllocationSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

StockAllocationSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

StockAllocationSchema.virtual("staffMember", {
  ref: "StaffMember",
  localField: "staffMemberId",
  foreignField: "_id",
  justOne: true,
});

StockAllocationSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockAllocationSchema.virtual("approvedByManager", {
  ref: "StaffMember",
  localField: "approvedByManagerId",
  foreignField: "_id",
  justOne: true,
});

StockAllocationSchema.virtual("sourceLeftoverItem", {
  ref: "StockItem",
  localField: "sourceLeftoverItemId",
  foreignField: "_id",
  justOne: true,
});

StockAllocationSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
