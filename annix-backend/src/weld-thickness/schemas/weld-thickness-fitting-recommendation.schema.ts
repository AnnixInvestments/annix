import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WeldThicknessFittingRecommendationDocument =
  HydratedDocument<WeldThicknessFittingRecommendation>;

@Schema({
  collection: "weld_thickness_fitting_recommendations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WeldThicknessFittingRecommendation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  fitting_type: string;

  @Prop({ type: String, required: true })
  fitting_class: string;

  @Prop({ type: Number, required: true })
  nominal_bore_mm: number;

  @Prop({ type: Number, required: true })
  wall_thickness_mm: number;

  @Prop({ type: Number, required: true })
  temperature_celsius: number;

  @Prop({ type: Number, required: true })
  max_pressure_bar: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: String, required: false })
  updated_at: string;
}

export const WeldThicknessFittingRecommendationSchema = SchemaFactory.createForClass(
  WeldThicknessFittingRecommendation,
);
