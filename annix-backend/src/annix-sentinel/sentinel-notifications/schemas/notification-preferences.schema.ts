import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelNotificationPreferencesDocument =
  HydratedDocument<AnnixSentinelNotificationPreferences>;

@Schema({
  collection: "comply_sa_notification_preferences",
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelNotificationPreferences {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Boolean, required: true, default: true })
  emailEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  smsEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  whatsappEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: true })
  inAppEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: true })
  weeklyDigest: boolean;

  @Prop({ type: String, required: false })
  phone: string | null;
}

export const AnnixSentinelNotificationPreferencesSchema = SchemaFactory.createForClass(
  AnnixSentinelNotificationPreferences,
);
