import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MessageAttachmentDocument = HydratedDocument<MessageAttachment>;

@Schema({
  collection: "message_attachment",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MessageAttachment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  messageId: number;

  @Prop({ type: String, required: true })
  fileName: string;

  @Prop({ type: String, required: true })
  filePath: string;

  @Prop({ type: Number, required: true })
  fileSize: number;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const MessageAttachmentSchema = SchemaFactory.createForClass(MessageAttachment);

MessageAttachmentSchema.virtual("message", {
  ref: "Message",
  localField: "messageId",
  foreignField: "_id",
  justOne: true,
});
