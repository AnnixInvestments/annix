import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockIssuanceDocument = HydratedDocument<StockIssuance>;

@Schema({
  collection: "stock_issuances",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockIssuance {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  stockItemId: number;

  @Prop({ type: Number, required: true })
  issuerStaffId: number;

  @Prop({ type: Number, required: true })
  recipientStaffId: number;

  @Prop({ type: String, required: false })
  jobCardId: string;

  @Prop({ type: String, required: false })
  sessionId: string;

  @Prop({ type: String, required: false })
  cpoId: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  issuedByUserId: string;

  @Prop({ type: String, required: false })
  issuedByName: string;

  @Prop({ type: Date, required: true })
  issuedAt: Date;

  @Prop({ type: Boolean, required: true })
  undone: boolean;

  @Prop({ type: Date, required: false })
  undoneAt: Date;

  @Prop({ type: String, required: false })
  undoneByName: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedIssuedByUserId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const StockIssuanceSchema = SchemaFactory.createForClass(StockIssuance);

StockIssuanceSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("issuerStaff", {
  ref: "StaffMember",
  localField: "issuerStaffId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("recipientStaff", {
  ref: "StaffMember",
  localField: "recipientStaffId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("session", {
  ref: "IssuanceSession",
  localField: "sessionId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("cpo", {
  ref: "CustomerPurchaseOrder",
  localField: "cpoId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("issuedByUser", {
  ref: "StockControlUser",
  localField: "issuedByUserId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

StockIssuanceSchema.virtual("unifiedIssuedByUser", {
  ref: "User",
  localField: "unifiedIssuedByUserId",
  foreignField: "_id",
  justOne: true,
});
