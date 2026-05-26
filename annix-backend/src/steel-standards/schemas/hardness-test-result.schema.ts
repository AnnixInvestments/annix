import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HardnessTestResultDocument = HydratedDocument<HardnessTestResult>;

@Schema({
  collection: "hardness_test_results",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HardnessTestResult {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  heatNumber: string;

  @Prop({ type: String, required: false })
  mtcReference: string;

  @Prop({ type: String, required: false })
  testLocation: string;

  @Prop({ type: Number, required: false })
  hardnessHrc: number;

  @Prop({ type: Number, required: false })
  hardnessHv: number;

  @Prop({ type: Number, required: false })
  hardnessHb: number;

  @Prop({ type: Number, required: false })
  maxAllowedHrc: number;

  @Prop({ type: Number, required: false })
  maxAllowedHv: number;

  @Prop({ type: Boolean, required: true })
  passed: boolean;

  @Prop({ type: Number, required: false })
  rfqItemId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const HardnessTestResultSchema = SchemaFactory.createForClass(HardnessTestResult);
