import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type Sabs62FittingDimensionDocument = HydratedDocument<Sabs62FittingDimension>;

@Schema({
  collection: "sabs62_fitting_dimension",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Sabs62FittingDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  fittingType: string;

  @Prop({ type: Number, required: true })
  nominalDiameterMm: number;

  @Prop({ type: Number, required: true })
  outsideDiameterMm: number;

  @Prop({ type: Number, required: false })
  nominalDiameterBMm: number;

  @Prop({ type: Number, required: false })
  outsideDiameterBMm: number;

  @Prop({ type: Number, required: false })
  nominalDiameterDMm: number;

  @Prop({ type: Number, required: false })
  outsideDiameterDMm: number;

  @Prop({ type: String, required: false })
  angleRange: string;

  @Prop({ type: Number, required: false })
  dimensionAMm: number;

  @Prop({ type: Number, required: false })
  dimensionBMm: number;

  @Prop({ type: Number, required: false })
  centreToFaceCMm: number;

  @Prop({ type: Number, required: false })
  centreToFaceDMm: number;

  @Prop({ type: Number, required: false })
  radiusRMm: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const Sabs62FittingDimensionSchema = SchemaFactory.createForClass(Sabs62FittingDimension);
