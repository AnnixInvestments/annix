import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcBlastProfileDocument = HydratedDocument<QcBlastProfile>;

@Schema({
  collection: "qc_blast_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcBlastProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  profileType: string;

  @Prop({ type: String, required: false })
  coatLabel: string;

  @Prop({ type: Number, required: true })
  specMicrons: number;

  @Prop({ type: String, required: false })
  abrasiveBatchNumber: string;

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

export const QcBlastProfileSchema = SchemaFactory.createForClass(QcBlastProfile);

QcBlastProfileSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcBlastProfileSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
