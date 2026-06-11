import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcDefelskoBatchDocument = HydratedDocument<QcDefelskoBatch>;

@Schema({
  collection: "qc_defelsko_batches",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcDefelskoBatch {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  fieldKey: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: Boolean, required: true })
  notApplicable: boolean;

  @Prop({ type: String, required: true })
  capturedByName: string;

  @Prop({ type: Number, required: false })
  capturedById: number;

  @Prop({ type: String, required: false })
  supplierCertificateId: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const QcDefelskoBatchSchema = SchemaFactory.createForClass(QcDefelskoBatch);

QcDefelskoBatchSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcDefelskoBatchSchema.virtual("supplierCertificate", {
  ref: "SupplierCertificate",
  localField: "supplierCertificateId",
  foreignField: "_id",
  justOne: true,
});

QcDefelskoBatchSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
