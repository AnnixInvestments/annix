import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AcademicResultDocument = HydratedDocument<AcademicResult>;

@Schema({
  collection: "orbit_education_academic_results",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AcademicResult {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  educationProfileId: string;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String, required: false })
  mark: string;

  @Prop({ type: String, required: false })
  predictedMark: string;

  @Prop({ type: Number, required: false })
  year: number;

  @Prop({ type: String, required: false })
  term: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const AcademicResultSchema = SchemaFactory.createForClass(AcademicResult);
