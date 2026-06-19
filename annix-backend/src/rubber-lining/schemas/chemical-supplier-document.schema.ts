import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ChemicalSupplierDocumentDocument = HydratedDocument<ChemicalSupplierDocument>;

@Schema({
  collection: "chemical_supplier_document",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ChemicalSupplierDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: Number, required: false })
  supplierCompanyId: number;

  @Prop({ type: String, required: false })
  deliveryNoteNumber: string;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: String, required: false })
  productName: string;

  @Prop({ type: String, required: true })
  documentPath: string;

  @Prop({ type: String, required: false })
  documentHash: string;

  @Prop({ type: String, required: true })
  processingStatus: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  reviewNotes: string;

  @Prop({ type: String, required: false })
  approvedBy: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Number, required: false })
  version: number;

  @Prop({ type: Number, required: false })
  previousVersionId: number;

  @Prop({ type: String, required: false })
  versionStatus: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const ChemicalSupplierDocumentSchema =
  SchemaFactory.createForClass(ChemicalSupplierDocument);

ChemicalSupplierDocumentSchema.virtual("supplierCompany", {
  ref: "RubberCompany",
  localField: "supplierCompanyId",
  foreignField: "_id",
  justOne: true,
});

ChemicalSupplierDocumentSchema.virtual("previousVersion", {
  ref: "ChemicalSupplierDocument",
  localField: "previousVersionId",
  foreignField: "_id",
  justOne: true,
});
