import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NixChatMessageDocument = HydratedDocument<NixChatMessage>;

@Schema({
  collection: "nix_chat_messages",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NixChatMessage {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  sessionId: number;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: Object, required: false })
  metadata: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  parentMessageId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const NixChatMessageSchema = SchemaFactory.createForClass(NixChatMessage);

NixChatMessageSchema.virtual("session", {
  ref: "NixChatSession",
  localField: "sessionId",
  foreignField: "_id",
  justOne: true,
});
