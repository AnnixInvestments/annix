import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type GasketWeightDocument = HydratedDocument<GasketWeight>;

@Schema({
  collection: "gasket_weights",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class GasketWeight {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  gasket_type: string;

  @Prop({ type: Number, required: true })
  nominal_bore_mm: number;

  @Prop({ type: Number, required: true })
  weight_kg: number;

  @Prop({ type: Number, required: false })
  inner_diameter_mm: number;

  @Prop({ type: Number, required: false })
  outer_diameter_mm: number;

  @Prop({ type: Number, required: false })
  thickness_mm: number;

  @Prop({ type: String, required: false })
  flange_standard: string;

  @Prop({ type: String, required: false })
  pressure_class: string;

  @Prop({ type: String, required: false })
  material: string;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: String, required: false })
  updated_at: string;
}

export const GasketWeightSchema = SchemaFactory.createForClass(GasketWeight);
