import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SpCoatingRateDocument = HydratedDocument<SpCoatingRate>;

@Schema({
  collection: "sp_coating_rates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SpCoatingRate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  rateCode: string;

  @Prop({ type: String, required: true })
  systemName: string;

  @Prop({ type: String, required: true })
  coatingCategory: string;

  @Prop({ type: String, required: false })
  iso12944Category: string;

  @Prop({ type: String, required: false })
  durabilityClass: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  totalDftUm: number;

  @Prop({ type: Number, required: true })
  numberOfCoats: number;

  @Prop({ type: Number, required: true })
  materialPricePerM2: number;

  @Prop({ type: Number, required: true })
  labourPricePerM2: number;

  @Prop({ type: Number, required: true })
  totalPricePerM2: number;

  @Prop({ type: Number, required: true })
  shopMultiplier: number;

  @Prop({ type: Number, required: true })
  fieldMultiplier: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: Number, required: false })
  supplierId: number;

  @Prop({ type: Date, required: false })
  effectiveFrom: Date;

  @Prop({ type: Date, required: false })
  effectiveTo: Date;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const SpCoatingRateSchema = SchemaFactory.createForClass(SpCoatingRate);
