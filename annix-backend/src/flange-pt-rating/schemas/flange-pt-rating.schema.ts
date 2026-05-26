import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlangePtRatingDocument = HydratedDocument<FlangePtRating>;

@Schema({
  collection: "flange_pt_ratings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlangePtRating {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  pressureClassId: number;

  @Prop({ type: String, required: true })
  materialGroup: string;

  @Prop({ type: Number, required: true })
  temperatureCelsius: number;

  @Prop({ type: Number, required: true })
  maxPressureBar: number;

  @Prop({ type: Number, required: false })
  maxPressurePsi: number;
}

export const FlangePtRatingSchema = SchemaFactory.createForClass(FlangePtRating);

FlangePtRatingSchema.virtual("pressureClass", {
  ref: "FlangePressureClass",
  localField: "pressureClassId",
  foreignField: "_id",
  justOne: true,
});
