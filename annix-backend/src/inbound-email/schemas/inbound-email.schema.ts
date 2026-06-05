import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InboundEmailDocument = HydratedDocument<InboundEmail>;

@Schema({
  collection: "inbound_emails",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InboundEmail {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  configId: number;

  @Prop({ type: String, required: true })
  app: string;

  @Prop({ type: Number, required: false })
  companyId: number;

  @Prop({ type: String, required: true })
  messageId: string;

  @Prop({ type: String, required: true })
  fromEmail: string;

  @Prop({ type: String, required: false })
  fromName: string;

  @Prop({ type: String, required: false })
  subject: string;

  @Prop({ type: Date, required: false })
  receivedAt: Date;

  @Prop({ type: Number, required: true })
  attachmentCount: number;

  @Prop({ type: String, required: true })
  processingStatus: string;

  @Prop({ type: String, required: false })
  errorMessage: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const InboundEmailSchema = SchemaFactory.createForClass(InboundEmail);

InboundEmailSchema.virtual("config", {
  ref: "InboundEmailConfig",
  localField: "configId",
  foreignField: "_id",
  justOne: true,
});

InboundEmailSchema.virtual("attachments", {
  ref: "InboundEmailAttachment",
  localField: "_id",
  foreignField: "inboundEmailId",
  justOne: false,
});
