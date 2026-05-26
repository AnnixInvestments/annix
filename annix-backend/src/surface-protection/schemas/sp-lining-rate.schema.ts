import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SpLiningRateDocument = HydratedDocument<SpLiningRate>;

@Schema({
  collection: "sp_lining_rates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SpLiningRate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  rateCode: string;

  @Prop({ type: String, required: true })
  systemName: string;

  @Prop({ type: String, required: true })
  liningType: string;

  @Prop({ type: String, required: true })
  liningCategory: string;

  @Prop({ type: Number, required: true })
  thicknessMm: number;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: false })
  hardnessIrhd: number;

  @Prop({ type: String, required: false })
  cureMethod: string;

  @Prop({ type: String, required: false })
  tileSizeMm: string;

  @Prop({ type: Number, required: false })
  maxTempC: number;

  @Prop({ type: Number, required: true })
  materialPricePerM2: number;

  @Prop({ type: Number, required: true })
  labourPricePerM2: number;

  @Prop({ type: Number, required: false })
  adhesivePricePerM2: number;

  @Prop({ type: Number, required: true })
  totalPricePerM2: number;

  @Prop({ type: Number, required: true })
  autoclaveMultiplier: number;

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

export const SpLiningRateSchema = SchemaFactory.createForClass(SpLiningRate);
