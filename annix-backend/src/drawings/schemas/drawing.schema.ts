import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DrawingDocument = HydratedDocument<Drawing>;

@Schema({
  collection: "drawings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Drawing {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  drawingNumber: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: true })
  fileType: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  currentVersion: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  rfqId: number;

  @Prop({ type: Number, required: false })
  uploadedById: number;
}

export const DrawingSchema = SchemaFactory.createForClass(Drawing);

DrawingSchema.virtual("rfq", {
  ref: "Rfq",
  localField: "rfqId",
  foreignField: "_id",
  justOne: true,
});

DrawingSchema.virtual("uploadedBy", {
  ref: "User",
  localField: "uploadedById",
  foreignField: "_id",
  justOne: true,
});

DrawingSchema.virtual("versions", {
  ref: "DrawingVersion",
  localField: "_id",
  foreignField: "drawingId",
  justOne: false,
});

DrawingSchema.virtual("comments", {
  ref: "DrawingComment",
  localField: "_id",
  foreignField: "drawingId",
  justOne: false,
});
