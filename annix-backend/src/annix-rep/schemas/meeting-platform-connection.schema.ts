import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MeetingPlatformConnectionDocument = HydratedDocument<MeetingPlatformConnection>;

@Schema({
  collection: "annix_rep_meeting_platform_connections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MeetingPlatformConnection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  platform: string;

  @Prop({ type: String, required: true })
  accountEmail: string;

  @Prop({ type: String, required: false })
  accountName: string;

  @Prop({ type: String, required: false })
  accountId: string;

  @Prop({ type: String, required: true })
  accessTokenEncrypted: string;

  @Prop({ type: String, required: false })
  refreshTokenEncrypted: string;

  @Prop({ type: Date, required: false })
  tokenExpiresAt: Date;

  @Prop({ type: String, required: false })
  tokenScope: string;

  @Prop({ type: String, required: false })
  webhookSubscriptionId: string;

  @Prop({ type: Date, required: false })
  webhookExpiry: Date;

  @Prop({ type: String, required: true })
  connectionStatus: string;

  @Prop({ type: String, required: false })
  lastError: string;

  @Prop({ type: Date, required: false })
  lastErrorAt: Date;

  @Prop({ type: Boolean, required: true })
  autoFetchRecordings: boolean;

  @Prop({ type: Boolean, required: true })
  autoTranscribe: boolean;

  @Prop({ type: Boolean, required: true })
  autoSendSummary: boolean;

  @Prop({ type: Date, required: false })
  lastRecordingSyncAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const MeetingPlatformConnectionSchema =
  SchemaFactory.createForClass(MeetingPlatformConnection);

MeetingPlatformConnectionSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

MeetingPlatformConnectionSchema.virtual("meetingRecords", {
  ref: "PlatformMeetingRecord",
  localField: "_id",
  foreignField: "connectionId",
  justOne: false,
});
