import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MarketingNewsletterSubscriberDocument = HydratedDocument<MarketingNewsletterSubscriber>;

@Schema({ collection: "marketing_newsletter_subscriber", timestamps: false })
export class MarketingNewsletterSubscriber {
  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  emailNormalized: string;

  @Prop({ type: String, default: "subscribed" })
  status: string;

  @Prop({ type: String, default: null })
  source: string | null;

  @Prop({ type: String, default: null })
  userAgent: string | null;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date, default: null })
  unsubscribedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastEmailedAt: Date | null;
}

export const MarketingNewsletterSubscriberSchema = SchemaFactory.createForClass(
  MarketingNewsletterSubscriber,
);
