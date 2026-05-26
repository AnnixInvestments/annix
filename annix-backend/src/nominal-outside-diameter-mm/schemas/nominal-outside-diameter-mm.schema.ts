import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NominalOutsideDiameterMmDocument = HydratedDocument<NominalOutsideDiameterMm>;

@Schema({
  collection: "nominal_outside_diameters",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NominalOutsideDiameterMm {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominal_diameter_mm: number;

  @Prop({ type: Number, required: true })
  outside_diameter_mm: number;
}

export const NominalOutsideDiameterMmSchema =
  SchemaFactory.createForClass(NominalOutsideDiameterMm);

NominalOutsideDiameterMmSchema.virtual("pipeDimensions", {
  ref: "PipeDimension",
  localField: "_id",
  foreignField: "nominalOutsideDiameterId",
  justOne: false,
});

NominalOutsideDiameterMmSchema.virtual("fittingBores", {
  ref: "FittingBore",
  localField: "_id",
  foreignField: "nominalOutsideDiameterId",
  justOne: false,
});

NominalOutsideDiameterMmSchema.virtual("flangeDimensions", {
  ref: "FlangeDimension",
  localField: "_id",
  foreignField: "nominalOutsideDiameterId",
  justOne: false,
});
