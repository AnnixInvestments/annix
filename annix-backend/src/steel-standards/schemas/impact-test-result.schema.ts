import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ImpactTestResultDocument = HydratedDocument<ImpactTestResult>;

@Schema({
  collection: "impact_test_results",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ImpactTestResult {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  heatNumber: string;

  @Prop({ type: String, required: false })
  mtcReference: string;

  @Prop({ type: Number, required: true })
  testTempC: number;

  @Prop({ type: String, required: false })
  specimenSize: string;

  @Prop({ type: String, required: false })
  specimenOrientation: string;

  @Prop({ type: Number, required: true })
  impactValue1J: number;

  @Prop({ type: Number, required: true })
  impactValue2J: number;

  @Prop({ type: Number, required: true })
  impactValue3J: number;

  @Prop({ type: Number, required: true })
  impactAverageJ: number;

  @Prop({ type: Number, required: false })
  requiredAvgJ: number;

  @Prop({ type: Number, required: false })
  requiredMinJ: number;

  @Prop({ type: Boolean, required: true })
  passed: boolean;

  @Prop({ type: Number, required: false })
  rfqItemId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const ImpactTestResultSchema = SchemaFactory.createForClass(ImpactTestResult);
