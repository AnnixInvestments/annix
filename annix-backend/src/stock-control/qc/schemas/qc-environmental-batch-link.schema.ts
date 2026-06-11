import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcEnvironmentalBatchLinkDocument = HydratedDocument<QcEnvironmentalBatchLink>;

@Schema({
  collection: "qc_environmental_batch_links",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcEnvironmentalBatchLink {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  batchAssignmentId: number;

  @Prop({ type: Number, required: true })
  environmentalRecordId: number;

  @Prop({ type: Date, required: true })
  activityDate: Date;

  @Prop({ type: String, required: true })
  pullRule: string;

  @Prop({ type: Date, required: true })
  resolvedDate: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const QcEnvironmentalBatchLinkSchema =
  SchemaFactory.createForClass(QcEnvironmentalBatchLink);

QcEnvironmentalBatchLinkSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcEnvironmentalBatchLinkSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
