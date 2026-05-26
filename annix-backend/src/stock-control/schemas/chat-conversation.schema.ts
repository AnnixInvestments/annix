import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ChatConversationDocument = HydratedDocument<ChatConversation>;

@Schema({
  collection: "stock_control_chat_conversations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ChatConversation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: false })
  name: string;

  @Prop({ type: Number, required: true })
  createdById: number;

  @Prop({ type: Date, required: false })
  lastMessageAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedCreatedById: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const ChatConversationSchema = SchemaFactory.createForClass(ChatConversation);

ChatConversationSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

ChatConversationSchema.virtual("createdBy", {
  ref: "StockControlUser",
  localField: "createdById",
  foreignField: "_id",
  justOne: true,
});

ChatConversationSchema.virtual("participants", {
  ref: "ChatConversationParticipant",
  localField: "_id",
  foreignField: "conversationId",
  justOne: false,
});

ChatConversationSchema.virtual("messages", {
  ref: "ChatMessage",
  localField: "_id",
  foreignField: "conversationId",
  justOne: false,
});

ChatConversationSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

ChatConversationSchema.virtual("unifiedCreatedBy", {
  ref: "User",
  localField: "unifiedCreatedById",
  foreignField: "_id",
  justOne: true,
});
