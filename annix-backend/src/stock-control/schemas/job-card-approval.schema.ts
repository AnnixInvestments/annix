import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardApprovalDocument = HydratedDocument<JobCardApproval>;

@Schema({
  collection: "job_card_approvals",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardApproval {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  step: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  approvedById: string;

  @Prop({ type: String, required: false })
  approvedByName: string;

  @Prop({ type: String, required: false })
  signatureUrl: string;

  @Prop({ type: String, required: false })
  comments: string;

  @Prop({ type: String, required: false })
  rejectedReason: string;

  @Prop({ type: String, required: false })
  outcomeKey: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedApprovedById: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const JobCardApprovalSchema = SchemaFactory.createForClass(JobCardApproval);

JobCardApprovalSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardApprovalSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardApprovalSchema.virtual("approvedBy", {
  ref: "StockControlUser",
  localField: "approvedById",
  foreignField: "_id",
  justOne: true,
});

JobCardApprovalSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

JobCardApprovalSchema.virtual("unifiedApprovedBy", {
  ref: "User",
  localField: "unifiedApprovedById",
  foreignField: "_id",
  justOne: true,
});
