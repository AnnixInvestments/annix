import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SteelSpecificationDocument = HydratedDocument<SteelSpecification>;

@Schema({
  collection: "steel_specifications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SteelSpecification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  steelSpecName: string;
}

export const SteelSpecificationSchema = SchemaFactory.createForClass(SteelSpecification);

SteelSpecificationSchema.virtual("fittings", {
  ref: "Fitting",
  localField: "_id",
  foreignField: "steelSpecificationId",
  justOne: false,
});

SteelSpecificationSchema.virtual("pipeDimensions", {
  ref: "PipeDimension",
  localField: "_id",
  foreignField: "steelSpecificationId",
  justOne: false,
});
