import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobCardImportJobDocument = HydratedDocument<JobCardImportJob>;

@Schema({
  collection: "job_card_import_jobs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobCardImportJob {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, default: null })
  createdByUserId: number | null;

  @Prop({ type: String, default: "processing" })
  status: string;

  @Prop({ type: String, default: "" })
  fileName: string;

  @Prop({ type: Number, default: 0 })
  totalDocuments: number;

  @Prop({ type: Number, default: 0 })
  completedDocuments: number;

  @Prop({ type: String, default: null })
  currentDocumentName: string | null;

  @Prop({ type: [Object], default: [] })
  drawingRows: Record<string, unknown>[];

  @Prop({ type: [String], default: [] })
  qualityDocuments: string[];

  @Prop({ type: String, default: null })
  documentNumber: string | null;

  @Prop({ type: String, default: null })
  sourceFilePath: string | null;

  @Prop({ type: String, default: null })
  sourceFileName: string | null;

  @Prop({ type: String, default: null })
  error: string | null;

  @Prop({ type: Boolean, default: false })
  acknowledged: boolean;
}

export const JobCardImportJobSchema = SchemaFactory.createForClass(JobCardImportJob);
