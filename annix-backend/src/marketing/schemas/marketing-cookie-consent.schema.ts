import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MarketingCookieConsentDocument = HydratedDocument<MarketingCookieConsent>;

@Schema({ collection: "marketing_cookie_consent", timestamps: false })
export class MarketingCookieConsent {
  @Prop({ type: String })
  consentId: string;

  @Prop({ type: Boolean })
  necessary: boolean;

  @Prop({ type: Boolean })
  functional: boolean;

  @Prop({ type: Boolean })
  analytics: boolean;

  @Prop({ type: Boolean })
  marketing: boolean;

  @Prop({ type: String })
  userAgent: string;

  @Prop({ type: Date })
  createdAt: Date;
}

export const MarketingCookieConsentSchema = SchemaFactory.createForClass(MarketingCookieConsent);
