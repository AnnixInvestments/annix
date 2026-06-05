import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobScreeningQuestionDocument = HydratedDocument<JobScreeningQuestion>;

@Schema({
  collection: "cv_assistant_job_screening_questions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobScreeningQuestion {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobPostingId: number;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: String, required: true })
  questionType: string;

  @Prop({ type: Object, required: false })
  options: Record<string, unknown>;

  @Prop({ type: String, required: false })
  disqualifyingAnswer: string;

  @Prop({ type: Number, required: true })
  weight: number;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const JobScreeningQuestionSchema = SchemaFactory.createForClass(JobScreeningQuestion);

JobScreeningQuestionSchema.virtual("jobPosting", {
  ref: "JobPosting",
  localField: "jobPostingId",
  foreignField: "_id",
  justOne: true,
});
