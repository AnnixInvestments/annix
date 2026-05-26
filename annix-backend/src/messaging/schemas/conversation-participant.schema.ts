import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ConversationParticipantDocument = HydratedDocument<ConversationParticipant>;

@Schema({
  collection: "conversation_participant",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ConversationParticipant {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  conversationId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: Date, required: true })
  joinedAt: Date;

  @Prop({ type: Date, required: false })
  leftAt: Date;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  lastReadAt: Date;
}

export const ConversationParticipantSchema = SchemaFactory.createForClass(ConversationParticipant);

ConversationParticipantSchema.virtual("conversation", {
  ref: "Conversation",
  localField: "conversationId",
  foreignField: "_id",
  justOne: true,
});

ConversationParticipantSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
