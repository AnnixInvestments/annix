import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type {
  PromoBillingCycle,
  PromoDiscountDuration,
  PromoDiscountType,
} from "../entities/promo-code.entity";

export type PromoCodeDocument = HydratedDocument<PromoCode>;

@Schema({
  collection: "promo_code",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PromoCode {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, default: "" })
  description: string;

  @Prop({ type: String, required: false })
  moduleKey: string;

  @Prop({ type: String, required: true })
  discountType: PromoDiscountType;

  @Prop({ type: Number, required: true })
  discountValue: number;

  @Prop({ type: [String], default: [] })
  appliesToTiers: string[];

  @Prop({ type: [Number], default: [] })
  assignedCompanyIds: number[];

  @Prop({ type: String, default: "any" })
  billingCycle: PromoBillingCycle;

  @Prop({ type: String, default: "first_payment" })
  discountDuration: PromoDiscountDuration;

  @Prop({ type: Number, required: false })
  durationMonths: number;

  @Prop({ type: String, required: false })
  grantsTier: string;

  @Prop({ type: Number, required: false })
  maxRedemptions: number;

  @Prop({ type: Number, default: 0 })
  timesRedeemed: number;

  @Prop({ type: Date, required: false })
  validFrom: Date;

  @Prop({ type: Date, required: false })
  validUntil: Date;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Number, required: false })
  createdById: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);
