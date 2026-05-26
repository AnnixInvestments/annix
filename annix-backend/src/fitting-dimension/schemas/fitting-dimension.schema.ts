import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FittingDimensionDocument = HydratedDocument<FittingDimension>;

@Schema({
  collection: "fitting_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FittingDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  dimension_name: string;

  @Prop({ type: Number, required: true })
  dimension_value_mm: number;

  @Prop({ type: Number, required: false })
  angleRangeId: number;

  @Prop({ type: Number, required: false })
  variantId: number;
}

export const FittingDimensionSchema = SchemaFactory.createForClass(FittingDimension);

FittingDimensionSchema.virtual("angleRange", {
  ref: "AngleRange",
  localField: "angleRangeId",
  foreignField: "_id",
  justOne: true,
});

FittingDimensionSchema.virtual("variant", {
  ref: "FittingVariant",
  localField: "variantId",
  foreignField: "_id",
  justOne: true,
});
