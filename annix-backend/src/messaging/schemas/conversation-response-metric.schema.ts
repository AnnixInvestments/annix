import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ConversationResponseMetricDocument = HydratedDocument<ConversationResponseMetric>;

@Schema({
  collection: "conversation_response_metric",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ConversationResponseMetric {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  conversationId: number;

  @Prop({ type: Number, required: true })
  messageId: number;

  @Prop({ type: Number, required: true })
  responseMessageId: number;

  @Prop({ type: Number, required: true })
  responderId: number;

  @Prop({ type: Number, required: true })
  responseTimeMinutes: number;

  @Prop({ type: Boolean, required: true })
  withinSla: boolean;

  @Prop({ type: String, required: true })
  rating: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const ConversationResponseMetricSchema = SchemaFactory.createForClass(
  ConversationResponseMetric,
);

ConversationResponseMetricSchema.virtual("conversation", {
  ref: "Conversation",
  localField: "conversationId",
  foreignField: "_id",
  justOne: true,
});

ConversationResponseMetricSchema.virtual("message", {
  ref: "Message",
  localField: "messageId",
  foreignField: "_id",
  justOne: true,
});

ConversationResponseMetricSchema.virtual("responseMessage", {
  ref: "Message",
  localField: "responseMessageId",
  foreignField: "_id",
  justOne: true,
});

ConversationResponseMetricSchema.virtual("responder", {
  ref: "User",
  localField: "responderId",
  foreignField: "_id",
  justOne: true,
});
