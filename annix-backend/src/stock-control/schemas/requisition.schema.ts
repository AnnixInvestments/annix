import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RequisitionDocument = HydratedDocument<Requisition>;

@Schema({
  collection: "requisitions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Requisition {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  requisitionNumber: string;

  @Prop({ type: String, required: false })
  jobCardId: string;

  @Prop({ type: String, required: true })
  source: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  cpoId: string;

  @Prop({ type: Boolean, required: true })
  isCalloffOrder: boolean;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RequisitionSchema = SchemaFactory.createForClass(Requisition);

RequisitionSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

RequisitionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

RequisitionSchema.virtual("cpo", {
  ref: "CustomerPurchaseOrder",
  localField: "cpoId",
  foreignField: "_id",
  justOne: true,
});

RequisitionSchema.virtual("items", {
  ref: "RequisitionItem",
  localField: "_id",
  foreignField: "requisitionId",
  justOne: false,
});

RequisitionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
