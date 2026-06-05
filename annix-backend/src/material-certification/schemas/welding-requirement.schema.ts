import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WeldingRequirementDocument = HydratedDocument<WeldingRequirement>;

@Schema({
  collection: "welding_requirements",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WeldingRequirement {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  pNumber: string;

  @Prop({ type: String, required: false })
  groupNumber: string;

  @Prop({ type: String, required: true })
  materialDescription: string;

  @Prop({ type: String, required: false })
  typicalSpecifications: string;

  @Prop({ type: Number, required: false })
  preheatMinC: number;

  @Prop({ type: Number, required: false })
  interpassMaxC: number;

  @Prop({ type: Boolean, required: true })
  pwhtRequired: boolean;

  @Prop({ type: Number, required: false })
  pwhtTempMinC: number;

  @Prop({ type: Number, required: false })
  pwhtTempMaxC: number;

  @Prop({ type: Number, required: false })
  pwhtHoldHrsPerInch: number;

  @Prop({ type: Number, required: false })
  pwhtMinHoldHrs: number;

  @Prop({ type: Number, required: false })
  heatingRateMaxCPerHr: number;

  @Prop({ type: Number, required: false })
  coolingRateMaxCPerHr: number;

  @Prop({ type: Number, required: false })
  pwhtThicknessThresholdMm: number;

  @Prop({ type: String, required: false })
  recommendedFillerMetal: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const WeldingRequirementSchema = SchemaFactory.createForClass(WeldingRequirement);
