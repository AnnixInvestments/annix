import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierDocumentDocument = HydratedDocument<SupplierDocument>;

@Schema({
  collection: "sc_supplier_documents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  supplierId: number;

  @Prop({ type: String, required: true })
  docType: string;

  @Prop({ type: String, required: false })
  docNumber: string;

  @Prop({ type: Date, required: false })
  issuedAt: Date;

  @Prop({ type: Date, required: false })
  expiresAt: Date;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Number, required: false })
  uploadedById: number;

  @Prop({ type: String, required: false })
  uploadedByName: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const SupplierDocumentSchema = SchemaFactory.createForClass(SupplierDocument);

SupplierDocumentSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

SupplierDocumentSchema.virtual("supplier", {
  ref: "StockControlSupplier",
  localField: "supplierId",
  foreignField: "_id",
  justOne: true,
});

SupplierDocumentSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
