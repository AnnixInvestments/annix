import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ShopLaborRateDocument = HydratedDocument<ShopLaborRate>;

@Schema({
  collection: "shop_labor_rates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ShopLaborRate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: true })
  materialType: string;

  @Prop({ type: Number, required: true })
  ratePerHour: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: Date, required: false })
  effectiveFrom: Date;

  @Prop({ type: Date, required: false })
  effectiveTo: Date;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const ShopLaborRateSchema = SchemaFactory.createForClass(ShopLaborRate);
