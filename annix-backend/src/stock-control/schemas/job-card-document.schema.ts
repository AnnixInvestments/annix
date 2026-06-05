import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardDocumentDocument = HydratedDocument<JobCardDocument>;

@Schema({
  collection: "job_card_documents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  documentType: string;

  @Prop({ type: String, required: true })
  fileUrl: string;

  @Prop({ type: String, required: false })
  originalFilename: string;

  @Prop({ type: String, required: false })
  mimeType: string;

  @Prop({ type: Number, required: false })
  fileSizeBytes: number;

  @Prop({ type: String, required: false })
  uploadedById: string;

  @Prop({ type: String, required: false })
  uploadedByName: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUploadedById: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const JobCardDocumentSchema = SchemaFactory.createForClass(JobCardDocument);

JobCardDocumentSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardDocumentSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardDocumentSchema.virtual("uploadedBy", {
  ref: "StockControlUser",
  localField: "uploadedById",
  foreignField: "_id",
  justOne: true,
});

JobCardDocumentSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

JobCardDocumentSchema.virtual("unifiedUploadedBy", {
  ref: "User",
  localField: "unifiedUploadedById",
  foreignField: "_id",
  justOne: true,
});
