import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BroadcastDocument = HydratedDocument<Broadcast>;

@Schema({
  collection: "broadcast",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Broadcast {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: true })
  targetAudience: string;

  @Prop({ type: Number, required: true })
  sentById: number;

  @Prop({ type: String, required: true })
  priority: string;

  @Prop({ type: Date, required: false })
  expiresAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const BroadcastSchema = SchemaFactory.createForClass(Broadcast);

BroadcastSchema.virtual("sentBy", {
  ref: "User",
  localField: "sentById",
  foreignField: "_id",
  justOne: true,
});

BroadcastSchema.virtual("recipients", {
  ref: "BroadcastRecipient",
  localField: "_id",
  foreignField: "broadcastId",
  justOne: false,
});
