import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ExpansionJointRfqDocument = HydratedDocument<ExpansionJointRfq>;

@Schema({
  collection: "expansion_joint_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ExpansionJointRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  expansionJointType: string;

  @Prop({ type: Number, required: true })
  nominalDiameterMm: number;

  @Prop({ type: String, required: false })
  scheduleNumber: string;

  @Prop({ type: Number, required: false })
  wallThicknessMm: number;

  @Prop({ type: Number, required: false })
  outsideDiameterMm: number;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: String, required: false })
  bellowsJointType: string;

  @Prop({ type: String, required: false })
  bellowsMaterial: string;

  @Prop({ type: Number, required: false })
  axialMovementMm: number;

  @Prop({ type: Number, required: false })
  lateralMovementMm: number;

  @Prop({ type: Number, required: false })
  angularMovementDeg: number;

  @Prop({ type: String, required: false })
  supplierReference: string;

  @Prop({ type: String, required: false })
  catalogNumber: string;

  @Prop({ type: Number, required: false })
  unitCostFromSupplier: number;

  @Prop({ type: Number, required: true })
  markupPercentage: number;

  @Prop({ type: String, required: false })
  loopType: string;

  @Prop({ type: Number, required: false })
  loopHeightMm: number;

  @Prop({ type: Number, required: false })
  loopWidthMm: number;

  @Prop({ type: Number, required: false })
  pipeLengthTotalMm: number;

  @Prop({ type: Number, required: false })
  numberOfElbows: number;

  @Prop({ type: String, required: false })
  endConfiguration: string;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: false })
  pipeWeightKg: number;

  @Prop({ type: Number, required: false })
  elbowWeightKg: number;

  @Prop({ type: Number, required: false })
  flangeWeightKg: number;

  @Prop({ type: Number, required: false })
  numberOfButtWelds: number;

  @Prop({ type: Number, required: false })
  totalButtWeldLengthM: number;

  @Prop({ type: Number, required: false })
  numberOfFlangeWelds: number;

  @Prop({ type: Number, required: false })
  flangeWeldLengthM: number;

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

export const ExpansionJointRfqSchema = SchemaFactory.createForClass(ExpansionJointRfq);

ExpansionJointRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
