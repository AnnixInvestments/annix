import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardVersionDocument = HydratedDocument<JobCardVersion>;

@Schema({
  collection: "job_card_versions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardVersion {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  versionNumber: number;

  @Prop({ type: String, required: false })
  filePath: string;

  @Prop({ type: String, required: false })
  originalFilename: string;

  @Prop({ type: String, required: true })
  jobName: string;

  @Prop({ type: String, required: false })
  customerName: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Object, required: false })
  lineItemsSnapshot: Record<string, unknown>;

  @Prop({ type: String, required: false })
  workflowStatus: string;

  @Prop({ type: Object, required: false })
  approvalsSnapshot: Record<string, unknown>;

  @Prop({ type: String, required: false })
  amendmentNotes: string;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const JobCardVersionSchema = SchemaFactory.createForClass(JobCardVersion);

JobCardVersionSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardVersionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardVersionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
