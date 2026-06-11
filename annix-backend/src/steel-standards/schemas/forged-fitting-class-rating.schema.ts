import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ForgedFittingClassRatingDocument = HydratedDocument<ForgedFittingClassRating>;

@Schema({
  collection: "forged_fitting_class_ratings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ForgedFittingClassRating {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  standard: string;

  @Prop({ type: Number, required: true })
  fittingClass: number;

  @Prop({ type: String, required: true })
  connectionType: string;

  @Prop({ type: String, required: true })
  materialGroup: string;

  @Prop({ type: Number, required: true })
  temperatureC: number;

  @Prop({ type: Number, required: true })
  maxPressureBar: number;

  @Prop({ type: Number, required: false })
  socketDepthMultiplier: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const ForgedFittingClassRatingSchema =
  SchemaFactory.createForClass(ForgedFittingClassRating);
