import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CoatingSystemDocument = HydratedDocument<CoatingSystem>;

@Schema({
  collection: "coating_systems",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CoatingSystem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  systemCode: string;

  @Prop({ type: String, required: true })
  systemName: string;

  @Prop({ type: String, required: true })
  systemStandard: string;

  @Prop({ type: String, required: true })
  application: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  corrosivityCategories: string;

  @Prop({ type: String, required: true })
  durabilityClasses: string;

  @Prop({ type: Number, required: true })
  minTotalDftUm: number;

  @Prop({ type: Number, required: true })
  maxTotalDftUm: number;

  @Prop({ type: Number, required: true })
  numberOfCoats: number;

  @Prop({ type: String, required: true })
  surfacePrepGrade: string;

  @Prop({ type: Object, required: true })
  coatSpecifications: Record<string, unknown>;

  @Prop({ type: String, required: true })
  primerType: string;

  @Prop({ type: String, required: false })
  intermediateType: string;

  @Prop({ type: String, required: false })
  topcoatType: string;

  @Prop({ type: Number, required: false })
  minOperatingTempC: number;

  @Prop({ type: Number, required: false })
  maxOperatingTempC: number;

  @Prop({ type: String, required: false })
  chemicalResistance: string;

  @Prop({ type: String, required: false })
  uvResistance: string;

  @Prop({ type: Boolean, required: true })
  isRecommended: boolean;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CoatingSystemSchema = SchemaFactory.createForClass(CoatingSystem);
