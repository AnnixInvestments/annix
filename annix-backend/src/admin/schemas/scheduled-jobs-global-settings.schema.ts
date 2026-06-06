import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ScheduledJobsGlobalSettingsDocument = HydratedDocument<ScheduledJobsGlobalSettings>;

@Schema({
  collection: "scheduled_jobs_global_settings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ScheduledJobsGlobalSettings {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Boolean, required: true })
  suspendOnWeekendsAndHolidays: boolean;

  @Prop({ type: Boolean, required: false, default: false })
  pauseAllJobs: boolean;
}

export const ScheduledJobsGlobalSettingsSchema = SchemaFactory.createForClass(
  ScheduledJobsGlobalSettings,
);
