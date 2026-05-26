import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcReleaseCertificateDocument = HydratedDocument<QcReleaseCertificate>;

@Schema({
  collection: "qc_release_certificates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcReleaseCertificate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  jobCardId: number;

  @Prop({ type: Number, required: false })
  cpoId: number;

  @Prop({ type: String, required: false })
  certificateNumber: string;

  @Prop({ type: Object, required: false })
  blastingCheck: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  solutionsUsed: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  liningCheck: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  cureCycles: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  paintingChecks: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  finalInspection: Record<string, unknown>;

  @Prop({ type: String, required: false })
  comments: string;

  @Prop({ type: Date, required: false })
  certificateDate: Date;

  @Prop({ type: String, required: false })
  finalApprovalName: string;

  @Prop({ type: String, required: false })
  finalApprovalSignatureUrl: string;

  @Prop({ type: Date, required: false })
  finalApprovalDate: Date;

  @Prop({ type: String, required: true })
  capturedByName: string;

  @Prop({ type: Number, required: false })
  capturedById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const QcReleaseCertificateSchema = SchemaFactory.createForClass(QcReleaseCertificate);

QcReleaseCertificateSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcReleaseCertificateSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
