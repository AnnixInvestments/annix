import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobSkillDocument = HydratedDocument<JobSkill>;

@Schema({
  collection: "cv_assistant_job_skills",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobSkill {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobPostingId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  importance: string;

  @Prop({ type: String, required: true })
  proficiency: string;

  @Prop({ type: Number, required: false })
  yearsExperience: number;

  @Prop({ type: String, required: false })
  evidenceRequired: string;

  @Prop({ type: Number, required: true })
  weight: number;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const JobSkillSchema = SchemaFactory.createForClass(JobSkill);

JobSkillSchema.virtual("jobPosting", {
  ref: "JobPosting",
  localField: "jobPostingId",
  foreignField: "_id",
  justOne: true,
});
