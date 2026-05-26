import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ForgedFittingSeriesDocument = HydratedDocument<ForgedFittingSeries>;

@Schema({
  collection: "forged_fitting_series",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ForgedFittingSeries {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  pressureClass: number;

  @Prop({ type: String, required: true })
  connectionType: string;

  @Prop({ type: String, required: true })
  standardCode: string;

  @Prop({ type: String, required: false })
  description: string;
}

export const ForgedFittingSeriesSchema = SchemaFactory.createForClass(ForgedFittingSeries);

ForgedFittingSeriesSchema.virtual("dimensions", {
  ref: "ForgedFittingDimension",
  localField: "_id",
  foreignField: "seriesId",
  justOne: false,
});

ForgedFittingSeriesSchema.virtual("ptRatings", {
  ref: "ForgedFittingPtRating",
  localField: "_id",
  foreignField: "seriesId",
  justOne: false,
});
