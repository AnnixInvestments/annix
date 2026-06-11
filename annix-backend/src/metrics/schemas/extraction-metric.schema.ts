import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ExtractionMetricDocument = HydratedDocument<ExtractionMetric>;

@Schema({
  collection: "extraction_metric",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ExtractionMetric {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  operation: string;

  @Prop({ type: Number, required: true })
  durationMs: number;

  @Prop({ type: Number, required: false })
  payloadSizeBytes: number;

  @Prop({ type: Boolean, required: true })
  succeeded: boolean;

  @Prop({ type: String, default: null })
  failureReason: string | null;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const ExtractionMetricSchema = SchemaFactory.createForClass(ExtractionMetric);
