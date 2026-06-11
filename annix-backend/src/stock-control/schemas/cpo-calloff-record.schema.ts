import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CpoCalloffRecordDocument = HydratedDocument<CpoCalloffRecord>;

@Schema({
  collection: "cpo_calloff_records",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CpoCalloffRecord {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  cpoId: number;

  @Prop({ type: String, required: false })
  jobCardId: string;

  @Prop({ type: String, required: false })
  requisitionId: string;

  @Prop({ type: String, required: true })
  calloffType: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: false })
  calledOffAt: Date;

  @Prop({ type: Date, required: false })
  deliveredAt: Date;

  @Prop({ type: Date, required: false })
  invoicedAt: Date;

  @Prop({ type: Date, required: false })
  lastInvoiceReminderAt: Date;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CpoCalloffRecordSchema = SchemaFactory.createForClass(CpoCalloffRecord);

CpoCalloffRecordSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

CpoCalloffRecordSchema.virtual("cpo", {
  ref: "CustomerPurchaseOrder",
  localField: "cpoId",
  foreignField: "_id",
  justOne: true,
});

CpoCalloffRecordSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

CpoCalloffRecordSchema.virtual("requisition", {
  ref: "Requisition",
  localField: "requisitionId",
  foreignField: "_id",
  justOne: true,
});

CpoCalloffRecordSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
