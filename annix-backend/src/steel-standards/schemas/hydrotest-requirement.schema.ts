import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HydrotestRequirementDocument = HydratedDocument<HydrotestRequirement>;

@Schema({
  collection: "hydrotest_requirements",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HydrotestRequirement {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  codeDisplayName: string;

  @Prop({ type: Number, required: true })
  testPressureMultiplier: number;

  @Prop({ type: String, required: true })
  testPressureFormula: string;

  @Prop({ type: Number, required: true })
  holdTimeMinutes: number;

  @Prop({ type: Number, required: false })
  holdTimePerMmWall: number;

  @Prop({ type: Number, required: true })
  volumeLossMaxPct: number;

  @Prop({ type: Number, required: true })
  temperatureMinC: number;

  @Prop({ type: String, required: true })
  medium: string;

  @Prop({ type: Boolean, required: true })
  pneumaticAllowed: boolean;

  @Prop({ type: Number, required: false })
  pneumaticMultiplier: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const HydrotestRequirementSchema = SchemaFactory.createForClass(HydrotestRequirement);
