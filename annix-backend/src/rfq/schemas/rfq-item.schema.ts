import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RfqItemDocument = HydratedDocument<RfqItem>;

@Schema({
  collection: "rfq_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RfqItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  lineNumber: number;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  itemType: string;

  @Prop({ type: String, required: true })
  materialType: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: false })
  weightPerUnitKg: number;

  @Prop({ type: Number, required: false })
  totalWeightKg: number;

  @Prop({ type: Number, required: false })
  unitPrice: number;

  @Prop({ type: Number, required: false })
  totalPrice: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  rfqId: number;

  @Prop({ type: Number, required: false })
  straightPipeDetailsId: number;

  @Prop({ type: Number, required: false })
  bendDetailsId: number;

  @Prop({ type: Number, required: false })
  fittingDetailsId: number;

  @Prop({ type: Number, required: false })
  pipeSteelWorkDetailsId: number;

  @Prop({ type: Number, required: false })
  expansionJointDetailsId: number;

  @Prop({ type: Number, required: false })
  valveDetailsId: number;

  @Prop({ type: Number, required: false })
  instrumentDetailsId: number;

  @Prop({ type: Number, required: false })
  pumpDetailsId: number;

  @Prop({ type: Number, required: false })
  surfaceProtectionDetailsId: number;

  @Prop({ type: Number, required: false })
  tankChuteDetailsId: number;

  @Prop({ type: Number, required: false })
  fastenerDetailsId: number;
}

export const RfqItemSchema = SchemaFactory.createForClass(RfqItem);

RfqItemSchema.virtual("rfq", {
  ref: "Rfq",
  localField: "rfqId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("straightPipeDetails", {
  ref: "StraightPipeRfq",
  localField: "straightPipeDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("bendDetails", {
  ref: "BendRfq",
  localField: "bendDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("fittingDetails", {
  ref: "FittingRfq",
  localField: "fittingDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("pipeSteelWorkDetails", {
  ref: "PipeSteelWorkRfq",
  localField: "pipeSteelWorkDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("expansionJointDetails", {
  ref: "ExpansionJointRfq",
  localField: "expansionJointDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("valveDetails", {
  ref: "ValveRfq",
  localField: "valveDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("instrumentDetails", {
  ref: "InstrumentRfq",
  localField: "instrumentDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("pumpDetails", {
  ref: "PumpRfq",
  localField: "pumpDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("surfaceProtectionDetails", {
  ref: "SurfaceProtectionRfq",
  localField: "surfaceProtectionDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("tankChuteDetails", {
  ref: "TankChuteRfq",
  localField: "tankChuteDetailsId",
  foreignField: "_id",
  justOne: true,
});

RfqItemSchema.virtual("fastenerDetails", {
  ref: "FastenerRfq",
  localField: "fastenerDetailsId",
  foreignField: "_id",
  justOne: true,
});
