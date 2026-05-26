import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FittingDocument = HydratedDocument<Fitting>;

@Schema({
  collection: "fittings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Fitting {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  steelSpecificationId: number;

  @Prop({ type: Number, required: false })
  fittingTypeId: number;
}

export const FittingSchema = SchemaFactory.createForClass(Fitting);

FittingSchema.virtual("steelSpecification", {
  ref: "SteelSpecification",
  localField: "steelSpecificationId",
  foreignField: "_id",
  justOne: true,
});

FittingSchema.virtual("fittingType", {
  ref: "FittingType",
  localField: "fittingTypeId",
  foreignField: "_id",
  justOne: true,
});

FittingSchema.virtual("variants", {
  ref: "FittingVariant",
  localField: "_id",
  foreignField: "fittingId",
  justOne: false,
});
