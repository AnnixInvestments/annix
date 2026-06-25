import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MarketingScheduledSocialPostDocument = HydratedDocument<MarketingScheduledSocialPost>;

// One row per platform. A single "Schedule" click in the admin creates several
// rows sharing a batchId, each with its own platform, caption and time — so the
// user picks one set of times, clicks once, and the cron releases each post when
// its own scheduledAt arrives.
@Schema({ collection: "marketing_scheduled_social_post", timestamps: false })
export class MarketingScheduledSocialPost {
  @Prop({ type: String })
  batchId: string;

  @Prop({ type: String })
  platform: string;

  @Prop({ type: String })
  caption: string;

  @Prop({ type: String })
  imageUrl: string;

  @Prop({ type: Date, default: null })
  scheduledAt: Date | null;

  // pending → posting (claimed by the cron) → posted | failed; or cancelled.
  @Prop({ type: String, default: "pending" })
  status: string;

  @Prop({ type: String, default: null })
  resultMessage: string | null;

  @Prop({ type: String, default: null })
  createdBy: string | null;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  postedAt: Date | null;
}

export const MarketingScheduledSocialPostSchema = SchemaFactory.createForClass(
  MarketingScheduledSocialPost,
);
