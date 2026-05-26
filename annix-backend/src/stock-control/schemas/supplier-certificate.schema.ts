import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierCertificateDocument = HydratedDocument<SupplierCertificate>;

@Schema({
  collection: "supplier_certificates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierCertificate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  supplierId: number;

  @Prop({ type: String, required: false })
  stockItemId: string;

  @Prop({ type: String, required: false })
  jobCardId: string;

  @Prop({ type: String, required: true })
  certificateType: string;

  @Prop({ type: String, required: true })
  batchNumber: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Date, required: false })
  expiryDate: Date;

  @Prop({ type: Number, required: false })
  uploadedById: number;

  @Prop({ type: String, required: false })
  uploadedByName: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const SupplierCertificateSchema = SchemaFactory.createForClass(SupplierCertificate);

SupplierCertificateSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

SupplierCertificateSchema.virtual("supplier", {
  ref: "StockControlSupplier",
  localField: "supplierId",
  foreignField: "_id",
  justOne: true,
});

SupplierCertificateSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

SupplierCertificateSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

SupplierCertificateSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
