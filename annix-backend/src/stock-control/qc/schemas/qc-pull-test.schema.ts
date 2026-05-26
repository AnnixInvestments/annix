import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcPullTestDocument = HydratedDocument<QcPullTest>;

@Schema({
  collection: "qc_pull_tests",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcPullTest {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: false })
  itemDescription: string;

  @Prop({ type: Number, required: false })
  quantity: number;

  @Prop({ type: Object, required: true })
  solutions: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  forceGauge: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  areaReadings: Record<string, unknown>;

  @Prop({ type: String, required: false })
  comments: string;

  @Prop({ type: Date, required: true })
  readingDate: Date;

  @Prop({ type: String, required: false })
  finalApprovalName: string;

  @Prop({ type: Date, required: false })
  finalApprovalDate: Date;

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

export const QcPullTestSchema = SchemaFactory.createForClass(QcPullTest);

QcPullTestSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcPullTestSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
