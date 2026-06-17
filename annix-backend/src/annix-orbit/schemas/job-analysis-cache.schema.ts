import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobAnalysisCacheDocument = HydratedDocument<JobAnalysisCache>;

@Schema({
  collection: "cv_assistant_job_analysis_cache",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobAnalysisCache {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: [String], required: false })
  skills: string[];
}

export const JobAnalysisCacheSchema = SchemaFactory.createForClass(JobAnalysisCache);
