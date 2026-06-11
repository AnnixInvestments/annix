import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ChatConversationParticipantDocument = HydratedDocument<ChatConversationParticipant>;

@Schema({
  collection: "stock_control_chat_conversation_participants",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ChatConversationParticipant {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  conversationId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Date, required: false })
  lastReadAt: Date;

  @Prop({ type: String, required: false })
  unifiedUserId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const ChatConversationParticipantSchema = SchemaFactory.createForClass(
  ChatConversationParticipant,
);

ChatConversationParticipantSchema.virtual("conversation", {
  ref: "ChatConversation",
  localField: "conversationId",
  foreignField: "_id",
  justOne: true,
});

ChatConversationParticipantSchema.virtual("user", {
  ref: "StockControlUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

ChatConversationParticipantSchema.virtual("unifiedUser", {
  ref: "User",
  localField: "unifiedUserId",
  foreignField: "_id",
  justOne: true,
});
