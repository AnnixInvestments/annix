import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcpApprovalTokenDocument = HydratedDocument<QcpApprovalToken>;

@Schema({
  collection: "qcp_approval_tokens",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcpApprovalToken {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  controlPlanId: number;

  @Prop({ type: Number, required: true })
  controlPlanVersion: number;

  @Prop({ type: String, required: true })
  partyRole: string;

  @Prop({ type: String, required: true })
  recipientEmail: string;

  @Prop({ type: String, required: false })
  recipientName: string;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: Date, required: true })
  tokenExpiresAt: Date;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Object, required: false })
  activitiesSnapshot: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  submittedActivities: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  lineRemarks: Record<string, unknown>;

  @Prop({ type: String, required: false })
  overallComments: string;

  @Prop({ type: String, required: false })
  signatureName: string;

  @Prop({ type: String, required: false })
  signatureUrl: string;

  @Prop({ type: Date, required: false })
  signedAt: Date;

  @Prop({ type: String, required: false })
  sentByParty: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const QcpApprovalTokenSchema = SchemaFactory.createForClass(QcpApprovalToken);

QcpApprovalTokenSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcpApprovalTokenSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
