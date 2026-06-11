import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InboundEmailAttachmentDocument = HydratedDocument<InboundEmailAttachment>;

@Schema({
  collection: "inbound_email_attachments",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InboundEmailAttachment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  inboundEmailId: number;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: String, required: false })
  s3Path: string;

  @Prop({ type: String, required: true })
  documentType: string;

  @Prop({ type: Number, required: false })
  classificationConfidence: number;

  @Prop({ type: String, required: false })
  classificationSource: string;

  @Prop({ type: String, required: false })
  linkedEntityType: string;

  @Prop({ type: Number, required: false })
  linkedEntityId: number;

  @Prop({ type: String, required: true })
  extractionStatus: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  errorMessage: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const InboundEmailAttachmentSchema = SchemaFactory.createForClass(InboundEmailAttachment);

InboundEmailAttachmentSchema.virtual("inboundEmail", {
  ref: "InboundEmail",
  localField: "inboundEmailId",
  foreignField: "_id",
  justOne: true,
});
