import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({
  collection: "conversation",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Conversation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: String, required: true })
  conversationType: string;

  @Prop({ type: String, required: true })
  relatedEntityType: string;

  @Prop({ type: Number, required: false })
  relatedEntityId: number;

  @Prop({ type: Number, required: true })
  createdById: number;

  @Prop({ type: Date, required: false })
  lastMessageAt: Date;

  @Prop({ type: Boolean, required: true })
  isArchived: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.virtual("createdBy", {
  ref: "User",
  localField: "createdById",
  foreignField: "_id",
  justOne: true,
});

ConversationSchema.virtual("participants", {
  ref: "ConversationParticipant",
  localField: "_id",
  foreignField: "conversationId",
  justOne: false,
});

ConversationSchema.virtual("messages", {
  ref: "Message",
  localField: "_id",
  foreignField: "conversationId",
  justOne: false,
});
