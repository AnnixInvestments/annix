import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PvcCementPriceDocument = HydratedDocument<PvcCementPrice>;

@Schema({
  collection: "pvc_cement_prices",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PvcCementPrice {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalDiameter: number;

  @Prop({ type: Number, required: true })
  pricePerJoint: number;

  @Prop({ type: Number, required: false })
  cementVolumeMl: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const PvcCementPriceSchema = SchemaFactory.createForClass(PvcCementPrice);
