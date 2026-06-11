import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DrawingVersionDocument = HydratedDocument<DrawingVersion>;

@Schema({
  collection: "drawing_versions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DrawingVersion {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  versionNumber: number;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: false })
  changeNotes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Number, required: false })
  drawingId: number;

  @Prop({ type: Number, required: false })
  uploadedById: number;
}

export const DrawingVersionSchema = SchemaFactory.createForClass(DrawingVersion);

DrawingVersionSchema.virtual("drawing", {
  ref: "Drawing",
  localField: "drawingId",
  foreignField: "_id",
  justOne: true,
});

DrawingVersionSchema.virtual("uploadedBy", {
  ref: "User",
  localField: "uploadedById",
  foreignField: "_id",
  justOne: true,
});
