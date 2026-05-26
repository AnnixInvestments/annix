import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PositectorUploadDocument = HydratedDocument<PositectorUpload>;

@Schema({
  collection: "positector_uploads",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PositectorUpload {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: true })
  s3FilePath: string;

  @Prop({ type: String, required: false })
  batchName: string;

  @Prop({ type: String, required: false })
  probeType: string;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: String, required: false })
  detectedFormat: string;

  @Prop({ type: Object, required: true })
  headerData: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  readingsData: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  statisticsData: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  readingCount: number;

  @Prop({ type: Number, required: false })
  linkedJobCardId: number;

  @Prop({ type: Number, required: false })
  importRecordId: number;

  @Prop({ type: Date, required: false })
  importedAt: Date;

  @Prop({ type: String, required: true })
  uploadedByName: string;

  @Prop({ type: Number, required: false })
  uploadedById: number;

  @Prop({ type: String, required: false })
  fingerprint: string;

  @Prop({ type: Date, required: false })
  measurementDate: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PositectorUploadSchema = SchemaFactory.createForClass(PositectorUpload);

PositectorUploadSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

PositectorUploadSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
