import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardActionCompletionDocument = HydratedDocument<JobCardActionCompletion>;

@Schema({
  collection: "job_card_action_completions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardActionCompletion {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  stepKey: string;

  @Prop({ type: String, required: true })
  actionType: string;

  @Prop({ type: Number, required: true })
  completedById: number;

  @Prop({ type: String, required: true })
  completedByName: string;

  @Prop({ type: Date, required: true })
  completedAt: Date;

  @Prop({ type: Object, required: false })
  metadata: Record<string, unknown>;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedCompletedById: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const JobCardActionCompletionSchema = SchemaFactory.createForClass(JobCardActionCompletion);

JobCardActionCompletionSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardActionCompletionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardActionCompletionSchema.virtual("completedBy", {
  ref: "StockControlUser",
  localField: "completedById",
  foreignField: "_id",
  justOne: true,
});

JobCardActionCompletionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

JobCardActionCompletionSchema.virtual("unifiedCompletedBy", {
  ref: "User",
  localField: "unifiedCompletedById",
  foreignField: "_id",
  justOne: true,
});
