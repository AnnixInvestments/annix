import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberApplicationRatingDocument = HydratedDocument<RubberApplicationRating>;

@Schema({
  collection: "rubber_application_ratings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberApplicationRating {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  rubberTypeId: number;

  @Prop({ type: String, required: true })
  chemicalCategory: string;

  @Prop({ type: String, required: true })
  resistanceRating: string;

  @Prop({ type: Number, required: false })
  maxTempCelsius: number;

  @Prop({ type: Number, required: false })
  maxConcentrationPercent: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const RubberApplicationRatingSchema = SchemaFactory.createForClass(RubberApplicationRating);

RubberApplicationRatingSchema.virtual("rubberType", {
  ref: "RubberType",
  localField: "rubberTypeId",
  foreignField: "_id",
  justOne: true,
});
