import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitIndividualDocumentDocument = HydratedDocument<AnnixOrbitIndividualDocument>;

@Schema({
  collection: "cv_assistant_individual_documents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitIndividualDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  profileId: number;

  @Prop({ type: String, required: true })
  kind: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  sizeBytes: number;

  @Prop({ type: String, required: false })
  label: string;

  @Prop({ type: Boolean, required: false, default: false })
  isPhotoCapture: boolean;

  @Prop({ type: Boolean, required: false, default: false })
  needsClearScan: boolean;

  @Prop({ type: Number, required: false, default: 0 })
  scanRemindersSent: number;

  @Prop({ type: Date, required: false, default: null })
  lastScanReminderAt: Date | null;

  @Prop({ type: String, required: false })
  uploadedAt: string;
}

export const AnnixOrbitIndividualDocumentSchema = SchemaFactory.createForClass(
  AnnixOrbitIndividualDocument,
);

AnnixOrbitIndividualDocumentSchema.virtual("profile", {
  ref: "AnnixOrbitProfile",
  localField: "profileId",
  foreignField: "_id",
  justOne: true,
});
