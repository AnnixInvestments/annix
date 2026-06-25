import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardCoatingAnalysisDocument = HydratedDocument<JobCardCoatingAnalysis>;

@Schema({
  collection: "job_card_coating_analyses",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardCoatingAnalysis {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: false })
  applicationType: string;

  @Prop({ type: String, required: false })
  surfacePrep: string;

  @Prop({ type: String, required: false })
  extSurfacePrep: string;

  @Prop({ type: String, required: false })
  intSurfacePrep: string;

  @Prop({ type: Number, required: true, default: 0 })
  extM2: number;

  @Prop({ type: Number, required: true, default: 0 })
  intM2: number;

  @Prop({ type: Object, required: true, default: () => [] })
  coats: Record<string, unknown>;

  @Prop({ type: Object, required: true, default: () => [] })
  stockAssessment: Record<string, unknown>;

  @Prop({ type: Boolean, required: true, default: false })
  hasInternalLining: boolean;

  @Prop({ type: String, required: false })
  rawNotes: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  error: string;

  @Prop({ type: Date, required: false })
  analysedAt: Date;

  @Prop({ type: String, required: false })
  acceptedBy: string;

  @Prop({ type: Date, required: false })
  acceptedAt: Date;

  @Prop({ type: Object, required: false })
  pmEditedAssessment: Record<string, unknown>;

  @Prop({ type: String, required: false })
  pmEditedBy: string;

  @Prop({ type: Date, required: false })
  pmEditedAt: Date;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const JobCardCoatingAnalysisSchema = SchemaFactory.createForClass(JobCardCoatingAnalysis);

JobCardCoatingAnalysisSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardCoatingAnalysisSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardCoatingAnalysisSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
