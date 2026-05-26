import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PollingJobsGlobalSettingsDocument = HydratedDocument<PollingJobsGlobalSettings>;

@Schema({
  collection: "polling_jobs_global_settings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PollingJobsGlobalSettings {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Boolean, required: true })
  suspendOnWeekendsAndHolidays: boolean;
}

export const PollingJobsGlobalSettingsSchema =
  SchemaFactory.createForClass(PollingJobsGlobalSettings);
