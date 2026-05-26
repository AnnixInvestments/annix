import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MalleableIronFittingDimensionDocument = HydratedDocument<MalleableIronFittingDimension>;

@Schema({
  collection: "malleable_iron_fitting_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MalleableIronFittingDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  fittingType: string;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: Number, required: true })
  pressureClass: number;

  @Prop({ type: Number, required: false })
  centerToFaceMm: number;

  @Prop({ type: Number, required: false })
  threadLengthMm: number;

  @Prop({ type: Number, required: false })
  weightKg: number;

  @Prop({ type: String, required: true })
  standard: string;
}

export const MalleableIronFittingDimensionSchema = SchemaFactory.createForClass(
  MalleableIronFittingDimension,
);
