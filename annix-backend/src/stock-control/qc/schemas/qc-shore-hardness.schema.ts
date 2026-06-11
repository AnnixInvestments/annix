import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcShoreHardnessDocument = HydratedDocument<QcShoreHardness>;

@Schema({
  collection: "qc_shore_hardness",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcShoreHardness {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  rubberSpec: string;

  @Prop({ type: String, required: false })
  rubberBatchNumber: string;

  @Prop({ type: Number, required: true })
  requiredShore: number;

  @Prop({ type: Object, required: true })
  readings: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  averages: Record<string, unknown>;

  @Prop({ type: Date, required: true })
  readingDate: Date;

  @Prop({ type: String, required: true })
  capturedByName: string;

  @Prop({ type: Number, required: false })
  capturedById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const QcShoreHardnessSchema = SchemaFactory.createForClass(QcShoreHardness);

QcShoreHardnessSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcShoreHardnessSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
