import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type GussetConfigurationDocument = HydratedDocument<GussetConfiguration>;

@Schema({
  collection: "gusset_configurations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class GussetConfiguration {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  dnMin: number;

  @Prop({ type: Number, required: true })
  dnMax: number;

  @Prop({ type: Number, required: false })
  pressureClassMin: number;

  @Prop({ type: Number, required: false })
  pressureClassMax: number;

  @Prop({ type: Number, required: true })
  gussetCount: number;

  @Prop({ type: Number, required: true })
  thicknessMm: number;

  @Prop({ type: String, required: true })
  placementType: string;

  @Prop({ type: Number, required: true })
  heelOffsetMm: number;

  @Prop({ type: Number, required: true })
  gussetAngleDegrees: number;

  @Prop({ type: Number, required: true })
  symmetrySpacingDegrees: number;

  @Prop({ type: String, required: true })
  materialGrade: string;

  @Prop({ type: Number, required: true })
  allowableStressMpa: number;

  @Prop({ type: String, required: true })
  weldType: string;

  @Prop({ type: String, required: true })
  weldElectrode: string;

  @Prop({ type: Number, required: false })
  preheatTempC: number;

  @Prop({ type: Boolean, required: true })
  pwhtRequired: boolean;

  @Prop({ type: String, required: false })
  notes: string;
}

export const GussetConfigurationSchema = SchemaFactory.createForClass(GussetConfiguration);
