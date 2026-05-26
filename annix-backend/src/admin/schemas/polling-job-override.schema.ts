import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PollingJobOverrideDocument = HydratedDocument<PollingJobOverride>;

@Schema({
  collection: "polling_job_overrides",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PollingJobOverride {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Number, required: false })
  intervalMs: number;

  @Prop({ type: Number, required: false })
  nightSuspensionHours: number;
}

export const PollingJobOverrideSchema = SchemaFactory.createForClass(PollingJobOverride);
