import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardExtractionCorrectionDocument = HydratedDocument<JobCardExtractionCorrection>;

@Schema({
  collection: "job_card_extraction_corrections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardExtractionCorrection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: false })
  customerName: string;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: String, required: false })
  originalValue: string;

  @Prop({ type: String, required: true })
  correctedValue: string;

  @Prop({ type: String, required: false })
  correctedBy: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedCorrectedBy: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Number, required: false })
  correctedByUserId: number;

  @Prop({ type: Number, required: false })
  unifiedCorrectedByUserId: number;
}

export const JobCardExtractionCorrectionSchema = SchemaFactory.createForClass(
  JobCardExtractionCorrection,
);

JobCardExtractionCorrectionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

JobCardExtractionCorrectionSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

JobCardExtractionCorrectionSchema.virtual("correctedByUser", {
  ref: "StockControlUser",
  localField: "correctedByUserId",
  foreignField: "_id",
  justOne: true,
});

JobCardExtractionCorrectionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

JobCardExtractionCorrectionSchema.virtual("unifiedCorrectedByUser", {
  ref: "User",
  localField: "unifiedCorrectedByUserId",
  foreignField: "_id",
  justOne: true,
});
