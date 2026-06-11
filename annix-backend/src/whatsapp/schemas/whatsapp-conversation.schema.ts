import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WhatsAppConversationDocument = HydratedDocument<WhatsAppConversation>;

@Schema({
  collection: "whatsapp_conversations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WhatsAppConversation {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  waId: string;

  @Prop({ type: String, required: false, default: null })
  profileName: string | null;

  @Prop({ type: Date, required: true })
  lastMessageAt: Date;

  @Prop({ type: String, required: false, default: null })
  lastMessagePreview: string | null;

  @Prop({ type: String, required: true })
  lastDirection: string;

  @Prop({ type: Number, default: 0 })
  unreadCount: number;

  @Prop({ type: String, required: false, default: null })
  appContext: string | null;
}

export const WhatsAppConversationSchema = SchemaFactory.createForClass(WhatsAppConversation);
