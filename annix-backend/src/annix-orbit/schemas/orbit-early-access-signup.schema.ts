import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type OrbitEarlyAccessSignupDocument = HydratedDocument<OrbitEarlyAccessSignup>;

@Schema({
  collection: "cv_assistant_early_access_signups",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class OrbitEarlyAccessSignup {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  emailNormalized: string;

  @Prop({ type: String, required: true })
  mobileNumber: string;

  @Prop({ type: String, required: true })
  mobileNormalized: string;

  @Prop({ type: String, required: false, default: null })
  currentRole: string | null;

  @Prop({ type: String, required: false, default: null })
  industry: string | null;

  @Prop({ type: String, required: false, default: null })
  yearsExperience: string | null;

  @Prop({ type: String, required: false, default: null })
  ageRange: string | null;

  @Prop({ type: String, required: false, default: null })
  ethnicBackground: string | null;

  @Prop({ type: Boolean, default: false })
  consentToContact: boolean;

  @Prop({ type: Date, required: false, default: null })
  consentedAt: Date | null;

  @Prop({ type: String, default: "direct" })
  source: string;

  @Prop({ type: String, required: false, default: null })
  campaign: string | null;

  @Prop({ type: String, required: false, default: null })
  platform: string | null;

  @Prop({ type: String, required: false, default: null })
  device: string | null;

  @Prop({ type: String, required: true })
  referralCode: string;

  @Prop({ type: String, required: false, default: null })
  referredBy: string | null;

  @Prop({ type: Number, default: 0 })
  referralCount: number;

  @Prop({ type: Date, required: false, default: null })
  welcomeSentAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  day3SentAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  day7SentAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  launchSentAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  adminEmailSentAt: Date | null;
}

export const OrbitEarlyAccessSignupSchema = SchemaFactory.createForClass(OrbitEarlyAccessSignup);
