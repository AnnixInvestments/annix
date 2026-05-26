import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AngleRangeDocument = HydratedDocument<AngleRange>;

@Schema({
  collection: "angle_ranges",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AngleRange {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  angle_min: number;

  @Prop({ type: Number, required: true })
  angle_max: number;
}

export const AngleRangeSchema = SchemaFactory.createForClass(AngleRange);

AngleRangeSchema.virtual("fittingDimensions", {
  ref: "FittingDimension",
  localField: "_id",
  foreignField: "angleRangeId",
  justOne: false,
});
