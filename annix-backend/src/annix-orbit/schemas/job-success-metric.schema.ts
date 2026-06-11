import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobSuccessMetricDocument = HydratedDocument<JobSuccessMetric>;

@Schema({
  collection: "cv_assistant_job_success_metrics",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobSuccessMetric {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobPostingId: number;

  @Prop({ type: String, required: true })
  timeframe: string;

  @Prop({ type: String, required: true })
  metric: string;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const JobSuccessMetricSchema = SchemaFactory.createForClass(JobSuccessMetric);

JobSuccessMetricSchema.virtual("jobPosting", {
  ref: "JobPosting",
  localField: "jobPostingId",
  foreignField: "_id",
  justOne: true,
});
