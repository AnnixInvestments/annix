import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardBackgroundCompletionDocument = HydratedDocument<JobCardBackgroundCompletion>;

@Schema({
  collection: "job_card_background_completions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardBackgroundCompletion {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  stepKey: string;

  @Prop({ type: String, required: false })
  completedById: string;

  @Prop({ type: String, required: false })
  completedByName: string;

  @Prop({ type: Date, required: true })
  completedAt: Date;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: true })
  completionType: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedCompletedById: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const JobCardBackgroundCompletionSchema = SchemaFactory.createForClass(
  JobCardBackgroundCompletion,
);

JobCardBackgroundCompletionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardBackgroundCompletionSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardBackgroundCompletionSchema.virtual("completedBy", {
  ref: "StockControlUser",
  localField: "completedById",
  foreignField: "_id",
  justOne: true,
});

JobCardBackgroundCompletionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

JobCardBackgroundCompletionSchema.virtual("unifiedCompletedBy", {
  ref: "User",
  localField: "unifiedCompletedById",
  foreignField: "_id",
  justOne: true,
});
