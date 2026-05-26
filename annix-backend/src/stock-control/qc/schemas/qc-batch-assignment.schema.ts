import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcBatchAssignmentDocument = HydratedDocument<QcBatchAssignment>;

@Schema({
  collection: "qc_batch_assignments",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcBatchAssignment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  batchNumber: string;

  @Prop({ type: String, required: true })
  fieldKey: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Number, required: true })
  lineItemId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: false })
  cpoId: number;

  @Prop({ type: Number, required: false })
  positectorUploadId: number;

  @Prop({ type: Number, required: false })
  supplierCertificateId: number;

  @Prop({ type: Boolean, required: true })
  notApplicable: boolean;

  @Prop({ type: String, required: true })
  capturedByName: string;

  @Prop({ type: Number, required: false })
  capturedById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const QcBatchAssignmentSchema = SchemaFactory.createForClass(QcBatchAssignment);

QcBatchAssignmentSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcBatchAssignmentSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
