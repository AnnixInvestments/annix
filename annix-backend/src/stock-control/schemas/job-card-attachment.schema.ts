import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardAttachmentDocument = HydratedDocument<JobCardAttachment>;

@Schema({
  collection: "job_card_attachments",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardAttachment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  attachmentType: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: true })
  extractionStatus: string;

  @Prop({ type: Object, required: true })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  extractionError: string;

  @Prop({ type: Date, required: false })
  extractedAt: Date;

  @Prop({ type: String, required: false })
  uploadedBy: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const JobCardAttachmentSchema = SchemaFactory.createForClass(JobCardAttachment);

JobCardAttachmentSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardAttachmentSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardAttachmentSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
