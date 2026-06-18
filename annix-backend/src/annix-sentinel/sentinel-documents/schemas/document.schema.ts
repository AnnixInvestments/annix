import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelDocumentDocument = HydratedDocument<AnnixSentinelDocument>;

@Schema({
  collection: "comply_sa_documents",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  requirementId: number | null;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: String, required: false })
  mimeType: string | null;

  @Prop({ type: Number, required: false })
  sizeBytes: number | null;

  @Prop({ type: Number, required: false })
  uploadedByUserId: number | null;

  @Prop({ type: Date, required: false })
  expiryDate: Date | null;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const AnnixSentinelDocumentSchema = SchemaFactory.createForClass(AnnixSentinelDocument);
