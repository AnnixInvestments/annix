import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FittingRfqDocument = HydratedDocument<FittingRfq>;

@Schema({
  collection: "fitting_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FittingRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalDiameterMm: number;

  @Prop({ type: String, required: true })
  scheduleNumber: string;

  @Prop({ type: Number, required: false })
  wallThicknessMm: number;

  @Prop({ type: String, required: true })
  fittingType: string;

  @Prop({ type: String, required: false })
  fittingStandard: string;

  @Prop({ type: Number, required: false })
  pipeLengthAMm: number;

  @Prop({ type: Number, required: false })
  pipeLengthBMm: number;

  @Prop({ type: String, required: false })
  pipeEndConfiguration: string;

  @Prop({ type: Boolean, required: true })
  addBlankFlange: boolean;

  @Prop({ type: Number, required: false })
  blankFlangeCount: number;

  @Prop({ type: Object, required: false })
  blankFlangePositions: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: String, required: true })
  quantityType: string;

  @Prop({ type: Number, required: false })
  workingPressureBar: number;

  @Prop({ type: Number, required: false })
  workingTemperatureC: number;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: false })
  numberOfFlanges: number;

  @Prop({ type: Number, required: false })
  numberOfFlangeWelds: number;

  @Prop({ type: Number, required: false })
  numberOfTeeWelds: number;

  @Prop({ type: Object, required: false })
  calculationData: Record<string, unknown>;

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
  hdpeFittingCategory: string;

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

  @Prop({ type: String, required: false })
  pvcFittingCategory: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  rfqItemId: number;
}

export const FittingRfqSchema = SchemaFactory.createForClass(FittingRfq);

FittingRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
