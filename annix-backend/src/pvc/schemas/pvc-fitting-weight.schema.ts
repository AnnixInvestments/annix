import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PvcFittingWeightDocument = HydratedDocument<PvcFittingWeight>;

@Schema({
  collection: "pvc_fitting_weights",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PvcFittingWeight {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  fittingTypeId: number;

  @Prop({ type: Number, required: true })
  nominalDiameter: number;

  @Prop({ type: Number, required: true })
  pressureRating: number;

  @Prop({ type: Number, required: true })
  weightKg: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const PvcFittingWeightSchema = SchemaFactory.createForClass(PvcFittingWeight);

PvcFittingWeightSchema.virtual("fittingType", {
  ref: "PvcFittingType",
  localField: "fittingTypeId",
  foreignField: "_id",
  justOne: true,
});
