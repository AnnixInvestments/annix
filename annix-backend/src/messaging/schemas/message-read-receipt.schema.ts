import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MessageReadReceiptDocument = HydratedDocument<MessageReadReceipt>;

@Schema({
  collection: "message_read_receipt",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MessageReadReceipt {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  messageId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Date, required: true })
  readAt: Date;
}

export const MessageReadReceiptSchema = SchemaFactory.createForClass(MessageReadReceipt);

MessageReadReceiptSchema.virtual("message", {
  ref: "Message",
  localField: "messageId",
  foreignField: "_id",
  justOne: true,
});

MessageReadReceiptSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
