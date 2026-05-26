import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberThicknessRecommendationDocument = HydratedDocument<RubberThicknessRecommendation>;

@Schema({
  collection: "rubber_thickness_recommendations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberThicknessRecommendation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalThicknessMm: number;

  @Prop({ type: Number, required: true })
  minPlies: number;

  @Prop({ type: Number, required: true })
  maxPlyThicknessMm: number;

  @Prop({ type: String, required: false })
  applicationNotes: string;

  @Prop({ type: Boolean, required: true })
  suitableForComplexShapes: boolean;
}

export const RubberThicknessRecommendationSchema = SchemaFactory.createForClass(
  RubberThicknessRecommendation,
);
