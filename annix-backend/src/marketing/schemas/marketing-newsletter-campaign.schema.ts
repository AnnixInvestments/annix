import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MarketingNewsletterCampaignDocument = HydratedDocument<MarketingNewsletterCampaign>;

@Schema({ collection: "marketing_newsletter_campaign", timestamps: false })
export class MarketingNewsletterCampaign {
  @Prop({ type: String })
  subject: string;

  @Prop({ type: String })
  body: string;

  @Prop({ type: Date, default: null })
  scheduledAt: Date | null;

  @Prop({ type: String, default: "pending" })
  status: string;

  @Prop({ type: Number, default: 0 })
  recipientCount: number;

  @Prop({ type: Number, default: 0 })
  sentCount: number;

  @Prop({ type: Number, default: 0 })
  failedCount: number;

  @Prop({ type: String, default: null })
  sentBy: string | null;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  sentAt: Date | null;
}

export const MarketingNewsletterCampaignSchema = SchemaFactory.createForClass(
  MarketingNewsletterCampaign,
);
