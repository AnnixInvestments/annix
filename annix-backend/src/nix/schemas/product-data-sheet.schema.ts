import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ProductDataSheetDocument = HydratedDocument<ProductDataSheet>;

@Schema({
  collection: "product_data_sheets",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ProductDataSheet {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  manufacturer: string;

  @Prop({ type: String, required: true })
  manufacturerSlug: string;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: true })
  productSlug: string;

  @Prop({ type: String, required: true })
  kind: string;

  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: String, required: false })
  publishedRevision: string;

  @Prop({ type: Date, required: false })
  publishedDate: Date;

  @Prop({ type: String, required: true })
  storagePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  sizeBytes: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: false })
  extractedBrand: string;

  @Prop({ type: String, required: false })
  extractedDescription: string;

  @Prop({ type: Number, required: false })
  uploadedByUserId: number;

  @Prop({ type: Boolean, required: true })
  isLatest: boolean;

  @Prop({ type: Number, required: false })
  supersededById: number;

  @Prop({ type: Date, required: false })
  supersededAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  uploadedById: number;
}

export const ProductDataSheetSchema = SchemaFactory.createForClass(ProductDataSheet);

ProductDataSheetSchema.virtual("uploadedBy", {
  ref: "User",
  localField: "uploadedById",
  foreignField: "_id",
  justOne: true,
});
