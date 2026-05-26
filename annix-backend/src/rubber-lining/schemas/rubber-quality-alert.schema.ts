import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberQualityAlertDocument = HydratedDocument<RubberQualityAlert>;

@Schema({
  collection: "rubber_quality_alerts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberQualityAlert {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  compoundCode: string;

  @Prop({ type: String, required: true })
  alertType: string;

  @Prop({ type: String, required: true })
  severity: string;

  @Prop({ type: String, required: true })
  metricName: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Number, required: true })
  metricValue: number;

  @Prop({ type: Number, required: true })
  thresholdValue: number;

  @Prop({ type: Number, required: true })
  meanValue: number;

  @Prop({ type: String, required: true })
  batchNumber: string;

  @Prop({ type: Number, required: true })
  batchId: number;

  @Prop({ type: Date, required: false })
  acknowledgedAt: Date;

  @Prop({ type: String, required: false })
  acknowledgedBy: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberQualityAlertSchema = SchemaFactory.createForClass(RubberQualityAlert);
