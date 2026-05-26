import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HdpeButtweldPriceDocument = HydratedDocument<HdpeButtweldPrice>;

@Schema({
  collection: "hdpe_buttweld_prices",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HdpeButtweldPrice {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalBore: number;

  @Prop({ type: Number, required: true })
  pricePerWeld: number;

  @Prop({ type: String, required: true })
  currency: string;

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

export const HdpeButtweldPriceSchema = SchemaFactory.createForClass(HdpeButtweldPrice);
