import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NixChatSessionDocument = HydratedDocument<NixChatSession>;

@Schema({
  collection: "nix_chat_sessions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NixChatSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: false })
  appScope: string;

  @Prop({ type: Number, required: false })
  rfqId: number;

  @Prop({ type: Object, required: true })
  conversationHistory: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  userPreferences: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  sessionContext: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  walkthroughState: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: true })
  lastInteractionAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const NixChatSessionSchema = SchemaFactory.createForClass(NixChatSession);
