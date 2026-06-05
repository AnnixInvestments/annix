import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierDocumentDocument = HydratedDocument<SupplierDocument>;

@Schema({
  collection: "supplier_documents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  supplierId: number;

  @Prop({ type: String, required: true })
  documentType: string;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: Number, required: true })
  fileSize: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Date, required: true })
  uploadedAt: Date;

  @Prop({ type: String, required: true })
  validationStatus: string;

  @Prop({ type: String, required: false })
  validationNotes: string;

  @Prop({ type: Number, required: false })
  reviewedById: number;

  @Prop({ type: Date, required: false })
  reviewedAt: Date;

  @Prop({ type: Date, required: false })
  expiryDate: Date;

  @Prop({ type: Boolean, required: true })
  isExpired: boolean;

  @Prop({ type: Date, required: false })
  expiryWarningSentAt: Date;

  @Prop({ type: Date, required: false })
  expiryNotificationSentAt: Date;

  @Prop({ type: Boolean, required: true })
  isRequired: boolean;

  @Prop({ type: Object, required: false })
  ocrExtractedData: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  ocrProcessedAt: Date;

  @Prop({ type: Boolean, required: true })
  ocrFailed: boolean;

  @Prop({ type: Number, required: false })
  verificationConfidence: number;

  @Prop({ type: Boolean, required: false })
  allFieldsMatch: boolean;

  @Prop({ type: Object, required: false })
  fieldResults: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const SupplierDocumentSchema = SchemaFactory.createForClass(SupplierDocument);

SupplierDocumentSchema.virtual("supplier", {
  ref: "SupplierProfile",
  localField: "supplierId",
  foreignField: "_id",
  justOne: true,
});

SupplierDocumentSchema.virtual("reviewedBy", {
  ref: "User",
  localField: "reviewedById",
  foreignField: "_id",
  justOne: true,
});
