import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlangeDimensionDocument = HydratedDocument<FlangeDimension>;

@Schema({
  collection: "flange_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlangeDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  D: number;

  @Prop({ type: Number, required: true })
  b: number;

  @Prop({ type: Number, required: true })
  d4: number;

  @Prop({ type: Number, required: true })
  f: number;

  @Prop({ type: Number, required: true })
  num_holes: number;

  @Prop({ type: Number, required: true })
  d1: number;

  @Prop({ type: Number, required: false })
  boltLengthMm: number;

  @Prop({ type: Number, required: true })
  pcd: number;

  @Prop({ type: Number, required: true })
  mass_kg: number;

  @Prop({ type: Number, required: false })
  nominalOutsideDiameterId: number;

  @Prop({ type: Number, required: false })
  standardId: number;

  @Prop({ type: Number, required: false })
  pressureClassId: number;

  @Prop({ type: Number, required: false })
  flangeTypeId: number;

  @Prop({ type: Number, required: false })
  boltId: number;
}

export const FlangeDimensionSchema = SchemaFactory.createForClass(FlangeDimension);

FlangeDimensionSchema.virtual("nominalOutsideDiameter", {
  ref: "NominalOutsideDiameterMm",
  localField: "nominalOutsideDiameterId",
  foreignField: "_id",
  justOne: true,
});

FlangeDimensionSchema.virtual("standard", {
  ref: "FlangeStandard",
  localField: "standardId",
  foreignField: "_id",
  justOne: true,
});

FlangeDimensionSchema.virtual("pressureClass", {
  ref: "FlangePressureClass",
  localField: "pressureClassId",
  foreignField: "_id",
  justOne: true,
});

FlangeDimensionSchema.virtual("flangeType", {
  ref: "FlangeType",
  localField: "flangeTypeId",
  foreignField: "_id",
  justOne: true,
});

FlangeDimensionSchema.virtual("bolt", {
  ref: "Bolt",
  localField: "boltId",
  foreignField: "_id",
  justOne: true,
});
