import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DispatchLoadPhotoDocument = HydratedDocument<DispatchLoadPhoto>;

@Schema({
  collection: "dispatch_load_photos",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DispatchLoadPhoto {
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
  caption: string;

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

export const DispatchLoadPhotoSchema = SchemaFactory.createForClass(DispatchLoadPhoto);

DispatchLoadPhotoSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

DispatchLoadPhotoSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

DispatchLoadPhotoSchema.virtual("uploadedBy", {
  ref: "StockControlUser",
  localField: "uploadedById",
  foreignField: "_id",
  justOne: true,
});

DispatchLoadPhotoSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

DispatchLoadPhotoSchema.virtual("unifiedUploadedBy", {
  ref: "User",
  localField: "unifiedUploadedById",
  foreignField: "_id",
  justOne: true,
});
