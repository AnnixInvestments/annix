import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DispatchCdnDocument = HydratedDocument<DispatchCdn>;

@Schema({
  collection: "dispatch_cdns",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DispatchCdn {
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

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: false })
  cdnNumber: string;

  @Prop({ type: Object, required: false })
  lineMatches: Record<string, unknown>;

  @Prop({ type: String, required: false })
  aiRawResponse: string;

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

export const DispatchCdnSchema = SchemaFactory.createForClass(DispatchCdn);

DispatchCdnSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

DispatchCdnSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

DispatchCdnSchema.virtual("uploadedBy", {
  ref: "StockControlUser",
  localField: "uploadedById",
  foreignField: "_id",
  justOne: true,
});

DispatchCdnSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

DispatchCdnSchema.virtual("unifiedUploadedBy", {
  ref: "User",
  localField: "unifiedUploadedById",
  foreignField: "_id",
  justOne: true,
});
