import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardDataBookDocument = HydratedDocument<JobCardDataBook>;

@Schema({
  collection: "job_card_data_books",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardDataBook {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: Date, required: true })
  generatedAt: Date;

  @Prop({ type: String, required: false })
  generatedByName: string;

  @Prop({ type: Number, required: true })
  certificateCount: number;

  @Prop({ type: Boolean, required: true })
  isStale: boolean;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const JobCardDataBookSchema = SchemaFactory.createForClass(JobCardDataBook);

JobCardDataBookSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardDataBookSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardDataBookSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
