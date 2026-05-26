import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MessageDocument = HydratedDocument<Message>;

@Schema({
  collection: "message",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Message {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  conversationId: number;

  @Prop({ type: Number, required: true })
  senderId: number;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: true })
  messageType: string;

  @Prop({ type: String, required: false })
  parentMessageId: string;

  @Prop({ type: Date, required: true })
  sentAt: Date;

  @Prop({ type: Date, required: false })
  editedAt: Date;

  @Prop({ type: Boolean, required: true })
  isDeleted: boolean;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.virtual("conversation", {
  ref: "Conversation",
  localField: "conversationId",
  foreignField: "_id",
  justOne: true,
});

MessageSchema.virtual("sender", {
  ref: "User",
  localField: "senderId",
  foreignField: "_id",
  justOne: true,
});

MessageSchema.virtual("parentMessage", {
  ref: "Message",
  localField: "parentMessageId",
  foreignField: "_id",
  justOne: true,
});

MessageSchema.virtual("attachments", {
  ref: "MessageAttachment",
  localField: "_id",
  foreignField: "messageId",
  justOne: false,
});

MessageSchema.virtual("readReceipts", {
  ref: "MessageReadReceipt",
  localField: "_id",
  foreignField: "messageId",
  justOne: false,
});
