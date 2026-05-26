import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeAllowableStressDocument = HydratedDocument<PipeAllowableStress>;

@Schema({
  collection: "pipe_allowable_stresses",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeAllowableStress {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  gradeId: number;

  @Prop({ type: Number, required: true })
  temperatureF: number;

  @Prop({ type: Number, required: true })
  allowableStressKsi: number;
}

export const PipeAllowableStressSchema = SchemaFactory.createForClass(PipeAllowableStress);

PipeAllowableStressSchema.virtual("grade", {
  ref: "PipeSteelGrade",
  localField: "gradeId",
  foreignField: "_id",
  justOne: true,
});
