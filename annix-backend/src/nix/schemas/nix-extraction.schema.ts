import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NixExtractionDocument = HydratedDocument<NixExtraction>;

@Schema({
  collection: "nix_extractions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NixExtraction {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  documentName: string;

  @Prop({ type: String, required: true })
  documentPath: string;

  @Prop({ type: String, required: true })
  documentType: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  rawText: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  extractedItems: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  relevanceScore: number;

  @Prop({ type: Number, required: false })
  pageCount: number;

  @Prop({ type: String, required: false })
  errorMessage: string;

  @Prop({ type: Number, required: false })
  processingTimeMs: number;

  @Prop({ type: Number, required: false })
  userId: number;

  @Prop({ type: Number, required: false })
  rfqId: number;

  @Prop({ type: String, required: false })
  sourceModule: string;

  @Prop({ type: Number, required: false })
  sourceId: number;

  @Prop({ type: String, required: false })
  extractionProfile: string;

  @Prop({ type: String, required: false })
  documentRole: string;

  @Prop({ type: String, required: false })
  storagePath: string;

  @Prop({ type: String, required: false })
  storageArea: string;

  @Prop({ type: Number, required: false })
  storageSizeBytes: number;

  @Prop({ type: String, required: false })
  storageMimeType: string;

  @Prop({ type: Number, required: false })
  sessionId: number;

  @Prop({ type: Number, required: false })
  mineId: number;

  @Prop({ type: String, required: false })
  mineCountry: string;

  @Prop({ type: Number, required: false })
  mineInferenceConfidence: number;

  @Prop({ type: String, required: false })
  mineInferenceReason: string;

  @Prop({ type: String, required: false })
  documentNumber: string;

  @Prop({ type: String, required: false })
  documentRevision: string;

  @Prop({ type: Boolean, required: true })
  isLatestRevision: boolean;

  @Prop({ type: Number, required: false })
  supersededByExtractionId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const NixExtractionSchema = SchemaFactory.createForClass(NixExtraction);

NixExtractionSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

NixExtractionSchema.virtual("rfq", {
  ref: "Rfq",
  localField: "rfqId",
  foreignField: "_id",
  justOne: true,
});

NixExtractionSchema.virtual("session", {
  ref: "NixExtractionSession",
  localField: "sessionId",
  foreignField: "_id",
  justOne: true,
});
