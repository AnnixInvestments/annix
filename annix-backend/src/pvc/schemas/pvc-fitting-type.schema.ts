import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PvcFittingTypeDocument = HydratedDocument<PvcFittingType>;

@Schema({
  collection: "pvc_fitting_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PvcFittingType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  numJoints: number;

  @Prop({ type: Boolean, required: true })
  isSocket: boolean;

  @Prop({ type: Boolean, required: true })
  isFlanged: boolean;

  @Prop({ type: Boolean, required: true })
  isThreaded: boolean;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: Number, required: false })
  angleDegrees: number;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const PvcFittingTypeSchema = SchemaFactory.createForClass(PvcFittingType);

PvcFittingTypeSchema.virtual("weights", {
  ref: "PvcFittingWeight",
  localField: "_id",
  foreignField: "fittingTypeId",
  justOne: false,
});
