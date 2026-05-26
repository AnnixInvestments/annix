import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationAiAdviceLogDocument = HydratedDocument<EducationAiAdviceLog>;

@Schema({
  collection: "orbit_education_ai_advice_log",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationAiAdviceLog {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: false })
  educationProfileId: string;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: String, required: true })
  answer: string;

  @Prop({ type: Object, required: false })
  groundingContext: Record<string, unknown>;

  @Prop({ type: String, required: false })
  model: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const EducationAiAdviceLogSchema = SchemaFactory.createForClass(EducationAiAdviceLog);
