import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobPostingDocument = HydratedDocument<JobPosting>;

@Schema({
  collection: "cv_assistant_job_postings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobPosting {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: [String], required: true, default: [] })
  requiredSkills: string[];

  @Prop({ type: Number, required: false })
  minExperienceYears: number;

  @Prop({ type: String, required: false })
  requiredEducation: string;

  @Prop({ type: [String], required: true, default: [] })
  requiredCertifications: string[];

  @Prop({ type: String, required: false })
  emailSubjectPattern: string;

  @Prop({ type: Boolean, required: true, default: false })
  autoRejectEnabled: boolean;

  @Prop({ type: Number, required: true, default: 35 })
  autoRejectThreshold: number;

  @Prop({ type: Number, required: true, default: 85 })
  autoAcceptThreshold: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  referenceNumber: string;

  @Prop({ type: Number, required: true })
  responseTimelineDays: number;

  @Prop({ type: String, required: false })
  location: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  employmentType: string;

  @Prop({ type: Number, required: false })
  salaryMin: number;

  @Prop({ type: Number, required: false })
  salaryMax: number;

  @Prop({ type: String, required: true })
  salaryCurrency: string;

  @Prop({ type: String, required: false })
  applyByEmail: string;

  @Prop({ type: Date, required: false })
  activatedAt: Date;

  @Prop({ type: Date, required: false })
  expiryDate: Date;

  @Prop({ type: [String], required: true, default: [] })
  enabledPortalCodes: string[];

  @Prop({ type: Boolean, required: true, default: false })
  testMode: boolean;

  @Prop({ type: String, required: false })
  normalizedTitle: string;

  @Prop({ type: String, required: false })
  industry: string;

  @Prop({ type: String, required: false })
  department: string;

  @Prop({ type: String, required: false })
  seniorityLevel: string;

  @Prop({ type: String, required: false })
  workMode: string;

  @Prop({ type: String, required: false })
  occupationalLevel: string;

  @Prop({ type: String, required: false })
  companyContext: string;

  @Prop({ type: String, required: false })
  mainPurpose: string;

  @Prop({ type: String, required: false })
  commissionStructure: string;

  @Prop({ type: [String], required: true, default: [] })
  benefits: string[];

  @Prop({ type: Number, required: true, default: 0 })
  qualityScore: number;

  @Prop({ type: Number, required: true, default: 0 })
  inclusivityScore: number;

  @Prop({ type: Object, required: false })
  nixSummary: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const JobPostingSchema = SchemaFactory.createForClass(JobPosting);

JobPostingSchema.virtual("skills", {
  ref: "JobSkill",
  localField: "_id",
  foreignField: "jobPostingId",
  justOne: false,
});

JobPostingSchema.virtual("successMetrics", {
  ref: "JobSuccessMetric",
  localField: "_id",
  foreignField: "jobPostingId",
  justOne: false,
});

JobPostingSchema.virtual("screeningQuestions", {
  ref: "JobScreeningQuestion",
  localField: "_id",
  foreignField: "jobPostingId",
  justOne: false,
});

JobPostingSchema.virtual("company", {
  ref: "AnnixOrbitCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobPostingSchema.virtual("candidates", {
  ref: "Candidate",
  localField: "_id",
  foreignField: "jobPostingId",
  justOne: false,
});
