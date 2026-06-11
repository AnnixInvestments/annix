import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardDocument = HydratedDocument<JobCard>;

@Schema({
  collection: "job_cards",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCard {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  jobNumber: string;

  @Prop({ type: String, required: false })
  jcNumber: string;

  @Prop({ type: String, required: false })
  pageNumber: string;

  @Prop({ type: String, required: true })
  jobName: string;

  @Prop({ type: String, required: false })
  customerName: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  poNumber: string;

  @Prop({ type: String, required: false })
  siteLocation: string;

  @Prop({ type: String, required: false })
  contactPerson: string;

  @Prop({ type: String, required: false })
  dueDate: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  reference: string;

  @Prop({ type: Object, required: false })
  customFields: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  rubberPlanOverride: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, default: "draft" })
  workflowStatus: string;

  @Prop({ type: Number, default: 1 })
  versionNumber: number;

  @Prop({ type: String, required: false })
  sourceFilePath: string;

  @Prop({ type: String, required: false })
  sourceFileName: string;

  @Prop({ type: Number, required: false })
  cpoId: number;

  @Prop({ type: Boolean, default: false })
  isCpoCalloff: boolean;

  @Prop({ type: Number, required: false })
  parentJobCardId: number;

  @Prop({ type: String, required: false })
  jtDnNumber: string;

  @Prop({ type: Number, required: false })
  supersededById: number;

  @Prop({ type: String, required: false })
  workflowCeiling: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const JobCardSchema = SchemaFactory.createForClass(JobCard);

JobCardSchema.virtual("cpo", {
  ref: "CustomerPurchaseOrder",
  localField: "cpoId",
  foreignField: "_id",
  justOne: true,
});

JobCardSchema.virtual("parentJobCard", {
  ref: "JobCard",
  localField: "parentJobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardSchema.virtual("deliveryJobCards", {
  ref: "JobCard",
  localField: "_id",
  foreignField: "parentJobCardId",
  justOne: false,
});

JobCardSchema.virtual("supersededBy", {
  ref: "JobCard",
  localField: "supersededById",
  foreignField: "_id",
  justOne: true,
});

JobCardSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardSchema.virtual("allocations", {
  ref: "StockAllocation",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("lineItems", {
  ref: "JobCardLineItem",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("documents", {
  ref: "JobCardDocument",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("jobFiles", {
  ref: "JobCardJobFile",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("approvals", {
  ref: "JobCardApproval",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("dispatchScans", {
  ref: "DispatchScan",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("dispatchCdns", {
  ref: "DispatchCdn",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("dispatchLoadPhotos", {
  ref: "DispatchLoadPhoto",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("versions", {
  ref: "JobCardVersion",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("attachments", {
  ref: "JobCardAttachment",
  localField: "_id",
  foreignField: "jobCardId",
  justOne: false,
});

JobCardSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
