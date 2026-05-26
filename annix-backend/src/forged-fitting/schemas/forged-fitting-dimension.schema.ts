import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ForgedFittingDimensionDocument = HydratedDocument<ForgedFittingDimension>;

@Schema({
  collection: "forged_fitting_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ForgedFittingDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  seriesId: number;

  @Prop({ type: Number, required: true })
  fittingTypeId: number;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: Number, required: false })
  dimensionAMm: number;

  @Prop({ type: Number, required: false })
  dimensionBMm: number;

  @Prop({ type: Number, required: false })
  dimensionCMm: number;

  @Prop({ type: Number, required: false })
  dimensionDMm: number;

  @Prop({ type: Number, required: false })
  dimensionEMm: number;

  @Prop({ type: Number, required: false })
  massKg: number;

  @Prop({ type: Number, required: false })
  socketDepthMm: number;

  @Prop({ type: Number, required: false })
  minWallThicknessMm: number;
}

export const ForgedFittingDimensionSchema = SchemaFactory.createForClass(ForgedFittingDimension);

ForgedFittingDimensionSchema.virtual("series", {
  ref: "ForgedFittingSeries",
  localField: "seriesId",
  foreignField: "_id",
  justOne: true,
});

ForgedFittingDimensionSchema.virtual("fittingType", {
  ref: "ForgedFittingType",
  localField: "fittingTypeId",
  foreignField: "_id",
  justOne: true,
});
