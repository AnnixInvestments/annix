import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberPricingTierDocument = HydratedDocument<RubberPricingTier>;

@Schema({
  collection: "rubber_pricing_tier",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberPricingTier {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true })
  pricingFactor: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberPricingTierSchema = SchemaFactory.createForClass(RubberPricingTier);
