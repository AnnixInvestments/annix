import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcControlPlanDocument = HydratedDocument<QcControlPlan>;

@Schema({
  collection: "qc_control_plans",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcControlPlan {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  jobCardId: number;

  @Prop({ type: Number, required: false })
  cpoId: number;

  @Prop({ type: String, required: true })
  planType: string;

  @Prop({ type: String, required: false })
  qcpNumber: string;

  @Prop({ type: String, required: false })
  documentRef: string;

  @Prop({ type: String, required: false })
  revision: string;

  @Prop({ type: String, required: false })
  customerName: string;

  @Prop({ type: String, required: false })
  orderNumber: string;

  @Prop({ type: String, required: false })
  jobNumber: string;

  @Prop({ type: String, required: false })
  jobName: string;

  @Prop({ type: String, required: false })
  specification: string;

  @Prop({ type: String, required: false })
  itemDescription: string;

  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: String, required: true })
  approvalStatus: string;

  @Prop({ type: String, required: false })
  clientEmail: string;

  @Prop({ type: String, required: false })
  thirdPartyEmail: string;

  @Prop({ type: Object, required: false })
  activeParties: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  activities: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  approvalSignatures: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  sourceCpoQcpId: number;

  @Prop({ type: String, required: true })
  createdByName: string;

  @Prop({ type: Number, required: false })
  createdById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const QcControlPlanSchema = SchemaFactory.createForClass(QcControlPlan);

QcControlPlanSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcControlPlanSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
