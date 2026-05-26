import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PromoCodeRedemptionDocument = HydratedDocument<PromoCodeRedemption>;

@Schema({
  collection: "promo_code_redemption",
  timestamps: { createdAt: "redeemedAt", updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PromoCodeRedemption {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  promoCodeId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  subscriptionId: number;

  @Prop({ type: Number, default: 0 })
  discountAppliedCents: number;

  @Prop({ type: Date, required: false })
  redeemedAt: Date;
}

export const PromoCodeRedemptionSchema = SchemaFactory.createForClass(PromoCodeRedemption);
