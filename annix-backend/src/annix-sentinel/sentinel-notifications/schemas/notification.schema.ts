import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelNotificationDocument = HydratedDocument<AnnixSentinelNotification>;

@Schema({
  collection: "comply_sa_notifications",
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelNotification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  userId: number | null;

  @Prop({ type: Number, required: false })
  requirementId: number | null;

  @Prop({ type: String, required: true })
  channel: string;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  message: string;

  @Prop({ type: Date, required: false })
  sentAt: Date;

  @Prop({ type: Date, required: false })
  readAt: Date | null;
}

export const AnnixSentinelNotificationSchema =
  SchemaFactory.createForClass(AnnixSentinelNotification);
