import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WhatsAppMessageDocument = HydratedDocument<WhatsAppMessage>;

@Schema({
  collection: "whatsapp_messages",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WhatsAppMessage {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  conversationId: string;

  @Prop({ type: String, required: true })
  direction: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: String, default: "text" })
  messageType: string;

  @Prop({ type: String, required: false, default: null })
  waMessageId: string | null;

  @Prop({ type: String, required: false, default: null })
  status: string | null;

  @Prop({ type: String, required: false, default: null })
  errorDetail: string | null;

  @Prop({ type: String, required: false, default: null })
  appContext: string | null;

  @Prop({ type: String, required: false, default: null })
  sentBy: string | null;

  @Prop({ type: Date, required: true })
  sentAt: Date;
}

export const WhatsAppMessageSchema = SchemaFactory.createForClass(WhatsAppMessage);
