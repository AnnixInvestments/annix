import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ProductDatasheetDocument = HydratedDocument<ProductDatasheet>;

@Schema({
  collection: "sm_product_datasheet",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ProductDatasheet {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  productType: string;

  @Prop({ type: Number, required: false })
  paintProductId: number;

  @Prop({ type: Number, required: false })
  rubberCompoundId: number;

  @Prop({ type: Number, required: false })
  solutionProductId: number;

  @Prop({ type: Number, required: false })
  consumableProductId: number;

  @Prop({ type: String, required: true })
  docType: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  revisionNumber: number;

  @Prop({ type: Date, required: false })
  issuedAt: Date;

  @Prop({ type: Date, required: false })
  expiresAt: Date;

  @Prop({ type: String, required: true })
  extractionStatus: string;

  @Prop({ type: Date, required: false })
  extractionStartedAt: Date;

  @Prop({ type: Date, required: false })
  extractionCompletedAt: Date;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  extractionModel: string;

  @Prop({ type: String, required: false })
  extractionNotes: string;

  @Prop({ type: String, required: false })
  uploadedAt: string;

  @Prop({ type: Number, required: false })
  uploadedById: number;

  @Prop({ type: String, required: false })
  uploadedByName: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const ProductDatasheetSchema = SchemaFactory.createForClass(ProductDatasheet);
