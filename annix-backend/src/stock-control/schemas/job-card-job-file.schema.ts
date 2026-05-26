import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardJobFileDocument = HydratedDocument<JobCardJobFile>;

@Schema({
  collection: "job_card_job_files",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardJobFile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: false })
  aiGeneratedName: string;

  @Prop({ type: String, required: true })
  fileType: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: false })
  uploadedById: string;

  @Prop({ type: String, required: false })
  uploadedByName: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUploadedById: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const JobCardJobFileSchema = SchemaFactory.createForClass(JobCardJobFile);

JobCardJobFileSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardJobFileSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardJobFileSchema.virtual("uploadedBy", {
  ref: "StockControlUser",
  localField: "uploadedById",
  foreignField: "_id",
  justOne: true,
});

JobCardJobFileSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

JobCardJobFileSchema.virtual("unifiedUploadedBy", {
  ref: "User",
  localField: "unifiedUploadedById",
  foreignField: "_id",
  justOne: true,
});
