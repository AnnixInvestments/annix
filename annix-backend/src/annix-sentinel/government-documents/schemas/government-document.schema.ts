import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelGovernmentDocumentDocument =
  HydratedDocument<AnnixSentinelGovernmentDocument>;

@Schema({
  collection: "comply_sa_government_documents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelGovernmentDocument {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  categoryLabel: string;

  @Prop({ type: String, required: false })
  department: string | null;

  @Prop({ type: String, required: false })
  departmentUrl: string | null;

  @Prop({ type: String, required: true })
  sourceUrl: string;

  @Prop({ type: String, required: false })
  filePath: string | null;

  @Prop({ type: Boolean, required: true, default: false })
  synced: boolean;

  @Prop({ type: Number, required: false })
  sizeBytes: number | null;

  @Prop({ type: String, required: false })
  mimeType: string | null;

  @Prop({ type: Number, required: true, default: 0 })
  sortOrder: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixSentinelGovernmentDocumentSchema = SchemaFactory.createForClass(
  AnnixSentinelGovernmentDocument,
);
