import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ScheduledJobOverrideDocument = HydratedDocument<ScheduledJobOverride>;

@Schema({
  collection: "scheduled_job_overrides",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ScheduledJobOverride {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: String, required: false })
  cronExpression: string;

  @Prop({ type: Number, required: false })
  nightSuspensionHours: number;
}

export const ScheduledJobOverrideSchema = SchemaFactory.createForClass(ScheduledJobOverride);
