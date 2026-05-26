import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ForgedFittingPtRatingDocument = HydratedDocument<ForgedFittingPtRating>;

@Schema({
  collection: "forged_fitting_pt_ratings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ForgedFittingPtRating {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  seriesId: number;

  @Prop({ type: Number, required: true })
  temperatureCelsius: number;

  @Prop({ type: Number, required: true })
  pressureMpa: number;

  @Prop({ type: String, required: true })
  materialGroup: string;
}

export const ForgedFittingPtRatingSchema = SchemaFactory.createForClass(ForgedFittingPtRating);

ForgedFittingPtRatingSchema.virtual("series", {
  ref: "ForgedFittingSeries",
  localField: "seriesId",
  foreignField: "_id",
  justOne: true,
});
