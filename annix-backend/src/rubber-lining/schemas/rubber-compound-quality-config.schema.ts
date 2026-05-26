import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCompoundQualityConfigDocument = HydratedDocument<RubberCompoundQualityConfig>;

@Schema({
  collection: "rubber_compound_quality_configs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCompoundQualityConfig {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  compoundCode: string;

  @Prop({ type: Number, required: true })
  windowSize: number;

  @Prop({ type: Number, required: false })
  shoreADriftThreshold: number;

  @Prop({ type: Number, required: false })
  specificGravityDriftThreshold: number;

  @Prop({ type: Number, required: false })
  reboundDriftThreshold: number;

  @Prop({ type: Number, required: false })
  tearStrengthDropPercent: number;

  @Prop({ type: Number, required: false })
  tensileStrengthDropPercent: number;

  @Prop({ type: Number, required: false })
  elongationDropPercent: number;

  @Prop({ type: Number, required: false })
  tc90CvThreshold: number;

  @Prop({ type: Number, required: false })
  shoreANominal: number;

  @Prop({ type: Number, required: false })
  shoreAMin: number;

  @Prop({ type: Number, required: false })
  shoreAMax: number;

  @Prop({ type: Number, required: false })
  densityNominal: number;

  @Prop({ type: Number, required: false })
  densityMin: number;

  @Prop({ type: Number, required: false })
  densityMax: number;

  @Prop({ type: Number, required: false })
  reboundNominal: number;

  @Prop({ type: Number, required: false })
  reboundMin: number;

  @Prop({ type: Number, required: false })
  reboundMax: number;

  @Prop({ type: Number, required: false })
  tearStrengthNominal: number;

  @Prop({ type: Number, required: false })
  tearStrengthMin: number;

  @Prop({ type: Number, required: false })
  tearStrengthMax: number;

  @Prop({ type: Number, required: false })
  tensileNominal: number;

  @Prop({ type: Number, required: false })
  tensileMin: number;

  @Prop({ type: Number, required: false })
  tensileMax: number;

  @Prop({ type: Number, required: false })
  elongationNominal: number;

  @Prop({ type: Number, required: false })
  elongationMin: number;

  @Prop({ type: Number, required: false })
  elongationMax: number;

  @Prop({ type: String, required: false })
  compoundDescription: string;

  @Prop({ type: String, required: false })
  updatedBy: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberCompoundQualityConfigSchema = SchemaFactory.createForClass(
  RubberCompoundQualityConfig,
);
