import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RetainingRingWeightDocument = HydratedDocument<RetainingRingWeight>;

@Schema({
  collection: "retaining_ring_weights",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RetainingRingWeight {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominal_bore_mm: number;

  @Prop({ type: Number, required: true })
  weight_kg: number;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: String, required: false })
  updated_at: string;
}

export const RetainingRingWeightSchema = SchemaFactory.createForClass(RetainingRingWeight);
