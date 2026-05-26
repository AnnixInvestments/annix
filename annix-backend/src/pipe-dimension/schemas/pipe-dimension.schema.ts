import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeDimensionDocument = HydratedDocument<PipeDimension>;

@Schema({
  collection: "pipe_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  wall_thickness_mm: number;

  @Prop({ type: Number, required: false })
  internal_diameter_mm: number;

  @Prop({ type: Number, required: true })
  mass_kgm: number;

  @Prop({ type: String, required: false })
  schedule_designation: string;

  @Prop({ type: Number, required: false })
  schedule_number: number;

  @Prop({ type: Number, required: false })
  nominalOutsideDiameterId: number;

  @Prop({ type: Number, required: false })
  steelSpecificationId: number;
}

export const PipeDimensionSchema = SchemaFactory.createForClass(PipeDimension);

PipeDimensionSchema.virtual("nominalOutsideDiameter", {
  ref: "NominalOutsideDiameterMm",
  localField: "nominalOutsideDiameterId",
  foreignField: "_id",
  justOne: true,
});

PipeDimensionSchema.virtual("pressures", {
  ref: "PipePressure",
  localField: "_id",
  foreignField: "pipeDimensionId",
  justOne: false,
});

PipeDimensionSchema.virtual("steelSpecification", {
  ref: "SteelSpecification",
  localField: "steelSpecificationId",
  foreignField: "_id",
  justOne: true,
});
