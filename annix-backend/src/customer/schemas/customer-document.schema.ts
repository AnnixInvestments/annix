import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerDocumentDocument = HydratedDocument<CustomerDocument>;

@Schema({
  collection: "customer_documents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  customerId: number;

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

  @Prop({ type: String, required: false })
  reviewedById: string;

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

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CustomerDocumentSchema = SchemaFactory.createForClass(CustomerDocument);

CustomerDocumentSchema.virtual("customer", {
  ref: "CustomerProfile",
  localField: "customerId",
  foreignField: "_id",
  justOne: true,
});

CustomerDocumentSchema.virtual("reviewedBy", {
  ref: "User",
  localField: "reviewedById",
  foreignField: "_id",
  justOne: true,
});
