import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SlaConfigDocument = HydratedDocument<SlaConfig>;

@Schema({
  collection: "sla_config",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SlaConfig {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  responseTimeHours: number;

  @Prop({ type: Number, required: true })
  excellentThresholdHours: number;

  @Prop({ type: Number, required: true })
  goodThresholdHours: number;

  @Prop({ type: Number, required: true })
  acceptableThresholdHours: number;

  @Prop({ type: Number, required: true })
  poorThresholdHours: number;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const SlaConfigSchema = SchemaFactory.createForClass(SlaConfig);
