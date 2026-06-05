import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobPostingPortalPostingDocument = HydratedDocument<JobPostingPortalPosting>;

@Schema({
  collection: "cv_assistant_job_posting_portal_postings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobPostingPortalPosting {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobPostingId: number;

  @Prop({ type: String, required: true })
  portalCode: string;

  @Prop({ type: String, required: false })
  portalJobId: string;

  @Prop({ type: String, required: false })
  portalUrl: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: false })
  postedAt: Date;

  @Prop({ type: String, required: false })
  lastError: string;

  @Prop({ type: Number, required: true })
  retryCount: number;

  @Prop({ type: Date, required: false })
  nextRetryAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const JobPostingPortalPostingSchema = SchemaFactory.createForClass(JobPostingPortalPosting);

JobPostingPortalPostingSchema.virtual("jobPosting", {
  ref: "JobPosting",
  localField: "jobPostingId",
  foreignField: "_id",
  justOne: true,
});
