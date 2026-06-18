import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelSubscriptionDocument = HydratedDocument<AnnixSentinelSubscription>;

@Schema({
  collection: "comply_sa_subscriptions",
  timestamps: { createdAt: true, updatedAt: true },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelSubscription {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true, default: "free" })
  tier: string;

  @Prop({ type: String, required: true, default: "trial" })
  status: string;

  @Prop({ type: Date, required: false })
  trialEndsAt: Date | null;

  @Prop({ type: Date, required: false })
  currentPeriodStart: Date | null;

  @Prop({ type: Date, required: false })
  currentPeriodEnd: Date | null;

  @Prop({ type: String, required: false })
  paystackCustomerId: string | null;

  @Prop({ type: String, required: false })
  paystackSubscriptionCode: string | null;

  @Prop({ type: Date, required: false })
  cancelledAt: Date | null;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixSentinelSubscriptionSchema =
  SchemaFactory.createForClass(AnnixSentinelSubscription);
