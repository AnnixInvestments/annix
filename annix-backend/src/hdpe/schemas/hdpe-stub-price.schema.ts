import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HdpeStubPriceDocument = HydratedDocument<HdpeStubPrice>;

@Schema({
  collection: "hdpe_stub_prices",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HdpeStubPrice {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalBore: number;

  @Prop({ type: Number, required: true })
  pricePerStub: number;

  @Prop({ type: Number, required: false })
  weightKg: number;

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

export const HdpeStubPriceSchema = SchemaFactory.createForClass(HdpeStubPrice);
