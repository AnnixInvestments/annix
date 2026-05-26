import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ForgedFittingTypeDocument = HydratedDocument<ForgedFittingType>;

@Schema({
  collection: "forged_fitting_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ForgedFittingType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;
}

export const ForgedFittingTypeSchema = SchemaFactory.createForClass(ForgedFittingType);

ForgedFittingTypeSchema.virtual("dimensions", {
  ref: "ForgedFittingDimension",
  localField: "_id",
  foreignField: "fittingTypeId",
  justOne: false,
});
