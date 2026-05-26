import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcEnvironmentalRecordDocument = HydratedDocument<QcEnvironmentalRecord>;

@Schema({
  collection: "qc_environmental_records",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcEnvironmentalRecord {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Date, required: true })
  recordDate: Date;

  @Prop({ type: Number, required: true })
  humidity: number;

  @Prop({ type: Number, required: true })
  temperatureC: number;

  @Prop({ type: Number, required: false })
  dewPointC: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: true })
  recordedByName: string;

  @Prop({ type: Number, required: false })
  recordedById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const QcEnvironmentalRecordSchema = SchemaFactory.createForClass(QcEnvironmentalRecord);

QcEnvironmentalRecordSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcEnvironmentalRecordSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
