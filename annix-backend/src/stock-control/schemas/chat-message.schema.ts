import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({
  collection: "stock_control_chat_messages",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ChatMessage {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  conversationId: number;

  @Prop({ type: Number, required: true })
  senderId: number;

  @Prop({ type: String, required: true })
  senderName: string;

  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: String, required: false })
  imageUrl: string;

  @Prop({ type: Date, required: false })
  editedAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedSenderId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

ChatMessageSchema.virtual("conversation", {
  ref: "ChatConversation",
  localField: "conversationId",
  foreignField: "_id",
  justOne: true,
});

ChatMessageSchema.virtual("sender", {
  ref: "StockControlUser",
  localField: "senderId",
  foreignField: "_id",
  justOne: true,
});

ChatMessageSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

ChatMessageSchema.virtual("unifiedSender", {
  ref: "User",
  localField: "unifiedSenderId",
  foreignField: "_id",
  justOne: true,
});
