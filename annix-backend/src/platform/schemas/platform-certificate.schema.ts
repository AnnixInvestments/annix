import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PlatformCertificateDocument = HydratedDocument<PlatformCertificate>;

@Schema({
  collection: "platform_certificates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PlatformCertificate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  sourceModule: string;

  @Prop({ type: String, required: true })
  certificateCategory: string;

  @Prop({ type: String, required: false })
  certificateNumber: string;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: Number, required: false })
  supplierContactId: number;

  @Prop({ type: String, required: false })
  filePath: string;

  @Prop({ type: String, required: false })
  graphPdfPath: string;

  @Prop({ type: String, required: false })
  originalFilename: string;

  @Prop({ type: Number, required: false })
  fileSizeBytes: number;

  @Prop({ type: String, required: false })
  mimeType: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  compoundCode: string;

  @Prop({ type: Date, required: false })
  productionDate: Date;

  @Prop({ type: Date, required: false })
  expiryDate: Date;

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
  uploadedByName: string;

  @Prop({ type: Date, required: false })
  exportedToSageAt: Date;

  @Prop({ type: Number, required: false })
  linkedDeliveryNoteId: number;

  @Prop({ type: Number, required: false })
  linkedCalenderRollCocId: number;

  @Prop({ type: Number, required: false })
  stockItemId: number;

  @Prop({ type: Number, required: false })
  jobCardId: number;

  @Prop({ type: String, required: false })
  orderNumber: string;

  @Prop({ type: String, required: false })
  ticketNumber: string;

  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: Number, required: false })
  previousVersionId: number;

  @Prop({ type: String, required: true })
  versionStatus: string;

  @Prop({ type: String, required: false })
  firebaseUid: string;

  @Prop({ type: Number, required: false })
  legacyScCertificateId: number;

  @Prop({ type: Number, required: false })
  legacyScCalibrationId: number;

  @Prop({ type: Number, required: false })
  legacyRubberCocId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const PlatformCertificateSchema = SchemaFactory.createForClass(PlatformCertificate);

PlatformCertificateSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

PlatformCertificateSchema.virtual("supplierContact", {
  ref: "Contact",
  localField: "supplierContactId",
  foreignField: "_id",
  justOne: true,
});
