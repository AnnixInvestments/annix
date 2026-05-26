import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeSteelGradeDocument = HydratedDocument<PipeSteelGrade>;

@Schema({
  collection: "pipe_steel_grades",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeSteelGrade {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: false })
  equivalentGrade: string;

  @Prop({ type: String, required: false })
  notes: string;
}

export const PipeSteelGradeSchema = SchemaFactory.createForClass(PipeSteelGrade);
