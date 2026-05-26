import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StraightPipeRfqDocument = HydratedDocument<StraightPipeRfq>;

@Schema({
  collection: "straight_pipe_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StraightPipeRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: String, required: true })
  scheduleType: string;

  @Prop({ type: String, required: false })
  scheduleNumber: string;

  @Prop({ type: Number, required: false })
  wallThicknessMm: number;

  @Prop({ type: String, required: false })
  pipeEndConfiguration: string;

  @Prop({ type: Number, required: true })
  individualPipeLength: number;

  @Prop({ type: String, required: true })
  lengthUnit: string;

  @Prop({ type: String, required: true })
  quantityType: string;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: Number, required: true })
  workingPressureBar: number;

  @Prop({ type: Number, required: false })
  workingTemperatureC: number;

  @Prop({ type: Number, required: false })
  calculatedOdMm: number;

  @Prop({ type: Number, required: false })
  calculatedWtMm: number;

  @Prop({ type: Number, required: false })
  pipeWeightPerMeterKg: number;

  @Prop({ type: Number, required: false })
  totalPipeWeightKg: number;

  @Prop({ type: Number, required: false })
  calculatedPipeCount: number;

  @Prop({ type: Number, required: false })
  calculatedTotalLengthM: number;

  @Prop({ type: Number, required: false })
  numberOfFlanges: number;

  @Prop({ type: Number, required: false })
  numberOfButtWelds: number;

  @Prop({ type: Number, required: false })
  totalButtWeldLengthM: number;

  @Prop({ type: Number, required: false })
  numberOfFlangeWelds: number;

  @Prop({ type: Number, required: false })
  totalFlangeWeldLengthM: number;

  @Prop({ type: String, required: false })
  pslLevel: string;

  @Prop({ type: Number, required: false })
  cvnTestTemperatureC: number;

  @Prop({ type: Number, required: false })
  cvnAverageJoules: number;

  @Prop({ type: Number, required: false })
  cvnMinimumJoules: number;

  @Prop({ type: String, required: false })
  heatNumber: string;

  @Prop({ type: String, required: false })
  mtcReference: string;

  @Prop({ type: Number, required: false })
  ndtCoveragePct: number;

  @Prop({ type: String, required: false })
  lotNumber: string;

  @Prop({ type: Boolean, required: false })
  naceCompliant: boolean;

  @Prop({ type: Number, required: false })
  h2sZone: number;

  @Prop({ type: Number, required: false })
  maxHardnessHrc: number;

  @Prop({ type: Boolean, required: false })
  sscTested: boolean;

  @Prop({ type: String, required: false })
  manufacturingProcess: string;

  @Prop({ type: String, required: false })
  deliveryCondition: string;

  @Prop({ type: Number, required: false })
  bevelAngleDeg: number;

  @Prop({ type: Number, required: false })
  rootFaceMm: number;

  @Prop({ type: Number, required: false })
  rootGapMm: number;

  @Prop({ type: String, required: false })
  unsNumber: string;

  @Prop({ type: Number, required: false })
  smysMpa: number;

  @Prop({ type: Number, required: false })
  carbonEquivalent: number;

  @Prop({ type: Number, required: false })
  hydrotestPressureMultiplier: number;

  @Prop({ type: Number, required: false })
  hydrotestHoldMin: number;

  @Prop({ type: Object, required: false })
  ndtMethods: Record<string, unknown>;

  @Prop({ type: String, required: false })
  lengthType: string;

  @Prop({ type: String, required: false })
  hdpePeGrade: string;

  @Prop({ type: Number, required: false })
  hdpeSdr: number;

  @Prop({ type: Number, required: false })
  hdpePnRating: number;

  @Prop({ type: String, required: false })
  hdpeColorCode: string;

  @Prop({ type: Number, required: false })
  hdpeOperatingTempC: number;

  @Prop({ type: Number, required: false })
  hdpeDeratedPn: number;

  @Prop({ type: String, required: false })
  hdpeWeldingMethod: string;

  @Prop({ type: String, required: false })
  hdpeWeldingStandard: string;

  @Prop({ type: Number, required: false })
  hdpeJointCount: number;

  @Prop({ type: String, required: false })
  pvcType: string;

  @Prop({ type: Number, required: false })
  pvcSdr: number;

  @Prop({ type: String, required: false })
  pvcPressureClass: string;

  @Prop({ type: Number, required: false })
  pvcPnRating: number;

  @Prop({ type: Number, required: false })
  pvcDeratedPn: number;

  @Prop({ type: Number, required: false })
  pvcOperatingTempC: number;

  @Prop({ type: String, required: false })
  pvcJoiningMethod: string;

  @Prop({ type: String, required: false })
  pvcColor: string;

  @Prop({ type: Number, required: false })
  rfqItemId: number;

  @Prop({ type: Number, required: false })
  steelSpecificationId: number;
}

export const StraightPipeRfqSchema = SchemaFactory.createForClass(StraightPipeRfq);

StraightPipeRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});

StraightPipeRfqSchema.virtual("steelSpecification", {
  ref: "SteelSpecification",
  localField: "steelSpecificationId",
  foreignField: "_id",
  justOne: true,
});
