import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcDftReadingDocument = HydratedDocument<QcDftReading>;

@Schema({
  collection: "qc_dft_readings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcDftReading {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  coatType: string;

  @Prop({ type: String, required: true })
  paintProduct: string;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: Number, required: true })
  specMinMicrons: number;

  @Prop({ type: Number, required: true })
  specMaxMicrons: number;

  @Prop({ type: Object, required: true })
  readings: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  averageMicrons: number;

  @Prop({ type: Number, required: false })
  temperature: number;

  @Prop({ type: Number, required: false })
  humidity: number;

  @Prop({ type: Date, required: true })
  readingDate: Date;

  @Prop({ type: String, required: true })
  capturedByName: string;

  @Prop({ type: Number, required: false })
  capturedById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const QcDftReadingSchema = SchemaFactory.createForClass(QcDftReading);

QcDftReadingSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcDftReadingSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
