import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TensileTestResultDocument = HydratedDocument<TensileTestResult>;

@Schema({
  collection: "tensile_test_results",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TensileTestResult {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  yieldMpa: number;

  @Prop({ type: Number, required: false })
  ultimateMpa: number;

  @Prop({ type: Number, required: false })
  elongationPct: number;

  @Prop({ type: Number, required: false })
  reductionOfAreaPct: number;

  @Prop({ type: Number, required: false })
  testTemperatureC: number;

  @Prop({ type: String, required: false })
  specimenOrientation: string;

  @Prop({ type: String, required: false })
  specimenLocation: string;

  @Prop({ type: String, required: false })
  heatNumber: string;

  @Prop({ type: String, required: false })
  mtcReference: string;

  @Prop({ type: Number, required: false })
  rfqItemId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const TensileTestResultSchema = SchemaFactory.createForClass(TensileTestResult);

TensileTestResultSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
