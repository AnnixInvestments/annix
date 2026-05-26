import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnsiB169FittingDimensionDocument = HydratedDocument<AnsiB169FittingDimension>;

@Schema({
  collection: "ansi_b16_9_fitting_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnsiB169FittingDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  fittingTypeId: number;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: Number, required: true })
  nbMm: number;

  @Prop({ type: Number, required: true })
  outsideDiameterMm: number;

  @Prop({ type: String, required: true })
  schedule: string;

  @Prop({ type: Number, required: true })
  wallThicknessMm: number;

  @Prop({ type: String, required: false })
  branchNps: string;

  @Prop({ type: Number, required: false })
  branchOdMm: number;

  @Prop({ type: Number, required: false })
  centerToFaceAMm: number;

  @Prop({ type: Number, required: false })
  centerToFaceBMm: number;

  @Prop({ type: Number, required: false })
  centerToCenterOMm: number;

  @Prop({ type: Number, required: false })
  backToFaceKMm: number;

  @Prop({ type: Number, required: false })
  centerToEndCMm: number;

  @Prop({ type: Number, required: false })
  centerToEndMMm: number;

  @Prop({ type: Number, required: false })
  weightKg: number;
}

export const AnsiB169FittingDimensionSchema =
  SchemaFactory.createForClass(AnsiB169FittingDimension);

AnsiB169FittingDimensionSchema.virtual("fittingType", {
  ref: "AnsiB169FittingType",
  localField: "fittingTypeId",
  foreignField: "_id",
  justOne: true,
});
