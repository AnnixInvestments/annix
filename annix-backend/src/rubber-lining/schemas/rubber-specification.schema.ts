import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberSpecificationDocument = HydratedDocument<RubberSpecification>;

@Schema({
  collection: "rubber_specifications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberSpecification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  rubberTypeId: number;

  @Prop({ type: String, required: true })
  grade: string;

  @Prop({ type: Number, required: true })
  hardnessClassIrhd: number;

  @Prop({ type: Number, required: true })
  tensileStrengthMpaMin: number;

  @Prop({ type: Number, required: true })
  elongationAtBreakMin: number;

  @Prop({ type: Number, required: true })
  tensileAfterAgeingMinPercent: number;

  @Prop({ type: Number, required: true })
  tensileAfterAgeingMaxPercent: number;

  @Prop({ type: Number, required: true })
  elongationAfterAgeingMinPercent: number;

  @Prop({ type: Number, required: true })
  elongationAfterAgeingMaxPercent: number;

  @Prop({ type: Number, required: true })
  hardnessChangeAfterAgeingMax: number;

  @Prop({ type: Number, required: false })
  heatResistance80cHardnessChangeMax: number;

  @Prop({ type: Number, required: false })
  heatResistance100cHardnessChangeMax: number;

  @Prop({ type: String, required: false })
  ozoneResistance: string;

  @Prop({ type: Number, required: false })
  chemicalResistanceHardnessChangeMax: number;

  @Prop({ type: Number, required: false })
  waterResistanceMaxPercent: number;

  @Prop({ type: Number, required: false })
  oilResistanceMaxPercent: number;

  @Prop({ type: Number, required: false })
  contaminantReleaseMaxPercent: number;

  @Prop({ type: String, required: true })
  sansStandard: string;
}

export const RubberSpecificationSchema = SchemaFactory.createForClass(RubberSpecification);

RubberSpecificationSchema.virtual("rubberType", {
  ref: "RubberType",
  localField: "rubberTypeId",
  foreignField: "_id",
  justOne: true,
});
