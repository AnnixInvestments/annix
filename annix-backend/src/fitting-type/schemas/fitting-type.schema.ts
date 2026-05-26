import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FittingTypeDocument = HydratedDocument<FittingType>;

@Schema({
  collection: "fitting_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FittingType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;
}

export const FittingTypeSchema = SchemaFactory.createForClass(FittingType);

FittingTypeSchema.virtual("fittings", {
  ref: "Fitting",
  localField: "_id",
  foreignField: "fittingTypeId",
  justOne: false,
});
