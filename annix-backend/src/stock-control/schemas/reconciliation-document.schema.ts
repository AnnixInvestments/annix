import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ReconciliationDocumentDocument = HydratedDocument<ReconciliationDocument>;

@Schema({
  collection: "reconciliation_documents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ReconciliationDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  documentCategory: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: false })
  mimeType: string;

  @Prop({ type: Number, required: false })
  fileSizeBytes: number;

  @Prop({ type: Number, required: false })
  uploadedById: number;

  @Prop({ type: String, required: false })
  uploadedByName: string;

  @Prop({ type: String, required: true })
  extractionStatus: string;

  @Prop({ type: Object, required: false })
  extractedItems: Record<string, unknown>;

  @Prop({ type: String, required: false })
  extractionError: string;

  @Prop({ type: Date, required: false })
  extractedAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const ReconciliationDocumentSchema = SchemaFactory.createForClass(ReconciliationDocument);

ReconciliationDocumentSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

ReconciliationDocumentSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
