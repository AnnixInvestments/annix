import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type Sabs719FittingDimensionDocument = HydratedDocument<Sabs719FittingDimension>;

@Schema({
  collection: "sabs719_fitting_dimension",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Sabs719FittingDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  fittingType: string;

  @Prop({ type: Number, required: true })
  nominalDiameterMm: number;

  @Prop({ type: Number, required: true })
  outsideDiameterMm: number;

  @Prop({ type: String, required: false })
  angleRange: string;

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
  dimensionFMm: number;

  @Prop({ type: Number, required: false })
  dimensionXMm: number;

  @Prop({ type: Number, required: false })
  dimensionYMm: number;

  @Prop({ type: Number, required: false })
  thicknessT1Mm: number;

  @Prop({ type: Number, required: false })
  thicknessT2Mm: number;

  @Prop({ type: Number, required: false })
  dimensionHMm: number;

  @Prop({ type: Number, required: false })
  radiusRMm: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const Sabs719FittingDimensionSchema = SchemaFactory.createForClass(Sabs719FittingDimension);
