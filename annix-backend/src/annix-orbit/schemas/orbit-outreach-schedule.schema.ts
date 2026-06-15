import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type OrbitOutreachScheduleDocument = HydratedDocument<OrbitOutreachSchedule>;

@Schema({
  collection: "cv_assistant_outreach_schedules",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class OrbitOutreachSchedule {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: String, required: true, default: "prod" })
  environment: string;

  @Prop({ type: [Object], default: [] })
  recipients: Array<{
    email: string;
    firstName: string | null;
    lastName: string | null;
    mobile: string | null;
    ageRange: string | null;
    device: string | null;
  }>;

  @Prop({ type: Boolean, default: true })
  includeDeviceGuide: boolean;

  @Prop({ type: Boolean, default: true })
  includeFbwGuide: boolean;

  @Prop({ type: [String], default: [] })
  extraAssetIds: string[];

  @Prop({ type: Boolean, default: false })
  trackEarlyAccess: boolean;

  @Prop({ type: String, required: false, default: null })
  provisionTier: string | null;

  @Prop({ type: Date, required: true })
  scheduledAt: Date;

  @Prop({ type: String, required: true, default: "pending" })
  status: string;

  @Prop({ type: Number, default: 0 })
  sentCount: number;

  @Prop({ type: Number, default: 0 })
  failedCount: number;

  @Prop({ type: [String], default: [] })
  failures: string[];

  @Prop({ type: Date, required: false, default: null })
  sentAt: Date | null;
}

export const OrbitOutreachScheduleSchema = SchemaFactory.createForClass(OrbitOutreachSchedule);
