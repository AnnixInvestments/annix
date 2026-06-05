import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type IssuanceSessionDocument = HydratedDocument<IssuanceSession>;

@Schema({
  collection: "issuance_sessions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IssuanceSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  cpoId: string;

  @Prop({ type: Number, required: true })
  issuerStaffId: number;

  @Prop({ type: Number, required: true })
  recipientStaffId: number;

  @Prop({ type: String, required: true })
  scope: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Object, required: true })
  jobCardIds: Record<string, unknown>;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  issuedByUserId: string;

  @Prop({ type: String, required: false })
  issuedByName: string;

  @Prop({ type: Date, required: true })
  issuedAt: Date;

  @Prop({ type: String, required: false })
  approvedByManagerId: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: Date, required: false })
  rejectedAt: Date;

  @Prop({ type: String, required: false })
  rejectionReason: string;

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

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const IssuanceSessionSchema = SchemaFactory.createForClass(IssuanceSession);

IssuanceSessionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

IssuanceSessionSchema.virtual("cpo", {
  ref: "CustomerPurchaseOrder",
  localField: "cpoId",
  foreignField: "_id",
  justOne: true,
});

IssuanceSessionSchema.virtual("issuerStaff", {
  ref: "StaffMember",
  localField: "issuerStaffId",
  foreignField: "_id",
  justOne: true,
});

IssuanceSessionSchema.virtual("recipientStaff", {
  ref: "StaffMember",
  localField: "recipientStaffId",
  foreignField: "_id",
  justOne: true,
});

IssuanceSessionSchema.virtual("issuedByUser", {
  ref: "StockControlUser",
  localField: "issuedByUserId",
  foreignField: "_id",
  justOne: true,
});

IssuanceSessionSchema.virtual("approvedByManager", {
  ref: "StaffMember",
  localField: "approvedByManagerId",
  foreignField: "_id",
  justOne: true,
});

IssuanceSessionSchema.virtual("issuances", {
  ref: "StockIssuance",
  localField: "_id",
  foreignField: "sessionId",
  justOne: false,
});

IssuanceSessionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

IssuanceSessionSchema.virtual("unifiedIssuedByUser", {
  ref: "User",
  localField: "unifiedIssuedByUserId",
  foreignField: "_id",
  justOne: true,
});
