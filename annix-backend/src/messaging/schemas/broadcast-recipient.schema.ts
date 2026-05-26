import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BroadcastRecipientDocument = HydratedDocument<BroadcastRecipient>;

@Schema({
  collection: "broadcast_recipient",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BroadcastRecipient {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  broadcastId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Date, required: false })
  readAt: Date;

  @Prop({ type: Date, required: false })
  emailSentAt: Date;
}

export const BroadcastRecipientSchema = SchemaFactory.createForClass(BroadcastRecipient);

BroadcastRecipientSchema.virtual("broadcast", {
  ref: "Broadcast",
  localField: "broadcastId",
  foreignField: "_id",
  justOne: true,
});

BroadcastRecipientSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
