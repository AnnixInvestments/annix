import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BendRfqDocument = HydratedDocument<BendRfq>;

@Schema({
  collection: "bend_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BendRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: String, required: true })
  scheduleNumber: string;

  @Prop({ type: Number, required: false })
  wallThicknessMm: number;

  @Prop({ type: String, required: false })
  bendType: string;

  @Prop({ type: String, required: false })
  bendRadiusType: string;

  @Prop({ type: Number, required: true })
  bendDegrees: number;

  @Prop({ type: String, required: false })
  bendEndConfiguration: string;

  @Prop({ type: Number, required: true })
  numberOfTangents: number;

  @Prop({ type: Object, required: true })
  tangentLengths: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  numberOfSegments: number;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: String, required: true })
  quantityType: string;

  @Prop({ type: Number, required: true })
  workingPressureBar: number;

  @Prop({ type: Number, required: true })
  workingTemperatureC: number;

  @Prop({ type: Number, required: true })
  steelSpecificationId: number;

  @Prop({ type: Boolean, required: true })
  useGlobalFlangeSpecs: boolean;

  @Prop({ type: Number, required: false })
  flangeStandardId: number;

  @Prop({ type: Number, required: false })
  flangePressureClassId: number;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: false })
  centerToFaceMm: number;

  @Prop({ type: Number, required: false })
  totalCost: number;

  @Prop({ type: Number, required: false })
  leadTimeDays: number;

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

  // Set by mongoose timestamps — declaring required:true makes validation
  // reject inserts before the plugin stamps them.
  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  rfqItemId: number;
}

export const BendRfqSchema = SchemaFactory.createForClass(BendRfq);

BendRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
