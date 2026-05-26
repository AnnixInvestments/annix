import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BnwSetWeightDocument = HydratedDocument<BnwSetWeight>;

@Schema({
  collection: "bnw_set_weights",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BnwSetWeight {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  pressure_class: string;

  @Prop({ type: Number, required: true })
  nominal_bore_mm: number;

  @Prop({ type: String, required: true })
  bolt_size: string;

  @Prop({ type: Number, required: true })
  weight_per_hole_kg: number;

  @Prop({ type: Number, required: true })
  num_holes: number;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: String, required: false })
  updated_at: string;
}

export const BnwSetWeightSchema = SchemaFactory.createForClass(BnwSetWeight);
