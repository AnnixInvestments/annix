import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeSteelWorkRfqDocument = HydratedDocument<PipeSteelWorkRfq>;

@Schema({
  collection: "pipe_steel_work_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeSteelWorkRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  workType: string;

  @Prop({ type: Number, required: true })
  nominalDiameterMm: number;

  @Prop({ type: Number, required: false })
  outsideDiameterMm: number;

  @Prop({ type: Number, required: false })
  wallThicknessMm: number;

  @Prop({ type: String, required: false })
  scheduleNumber: string;

  @Prop({ type: String, required: false })
  bracketType: string;

  @Prop({ type: String, required: true })
  supportStandard: string;

  @Prop({ type: Number, required: false })
  supportSpacingM: number;

  @Prop({ type: Number, required: false })
  pipelineLengthM: number;

  @Prop({ type: Number, required: false })
  numberOfSupports: number;

  @Prop({ type: Number, required: false })
  workingPressureBar: number;

  @Prop({ type: Number, required: false })
  workingTemperatureC: number;

  @Prop({ type: Number, required: false })
  branchDiameterMm: number;

  @Prop({ type: Number, required: false })
  headerDiameterMm: number;

  @Prop({ type: Number, required: false })
  padOuterDiameterMm: number;

  @Prop({ type: Number, required: false })
  padThicknessMm: number;

  @Prop({ type: Number, required: false })
  steelSpecificationId: number;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: String, required: true })
  quantityType: string;

  @Prop({ type: Number, required: false })
  weightPerUnitKg: number;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: false })
  unitCost: number;

  @Prop({ type: Number, required: false })
  totalCost: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Object, required: false })
  calculationData: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  rfqItemId: number;
}

export const PipeSteelWorkRfqSchema = SchemaFactory.createForClass(PipeSteelWorkRfq);

PipeSteelWorkRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
