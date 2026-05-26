import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PlatformMeetingRecordDocument = HydratedDocument<PlatformMeetingRecord>;

@Schema({
  collection: "annix_rep_platform_meeting_records",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PlatformMeetingRecord {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  connectionId: number;

  @Prop({ type: String, required: false })
  meetingId: string;

  @Prop({ type: String, required: true })
  platformMeetingId: string;

  @Prop({ type: String, required: false })
  platformRecordingId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  topic: string;

  @Prop({ type: String, required: false })
  hostEmail: string;

  @Prop({ type: Date, required: true })
  startTime: Date;

  @Prop({ type: Date, required: false })
  endTime: Date;

  @Prop({ type: Number, required: false })
  durationSeconds: number;

  @Prop({ type: String, required: false })
  recordingUrl: string;

  @Prop({ type: String, required: false })
  recordingPassword: string;

  @Prop({ type: String, required: false })
  recordingFileType: string;

  @Prop({ type: Number, required: false })
  recordingFileSizeBytes: number;

  @Prop({ type: String, required: false })
  s3StoragePath: string;

  @Prop({ type: String, required: false })
  s3StorageBucket: string;

  @Prop({ type: String, required: true })
  recordingStatus: string;

  @Prop({ type: String, required: false })
  recordingError: string;

  @Prop({ type: [String], required: false })
  participants: string;

  @Prop({ type: Number, required: false })
  participantCount: number;

  @Prop({ type: String, required: false })
  joinUrl: string;

  @Prop({ type: Object, required: false })
  rawMeetingData: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  rawRecordingData: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  fetchedAt: Date;

  @Prop({ type: Date, required: false })
  downloadedAt: Date;

  @Prop({ type: Date, required: false })
  processedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const PlatformMeetingRecordSchema = SchemaFactory.createForClass(PlatformMeetingRecord);

PlatformMeetingRecordSchema.virtual("connection", {
  ref: "MeetingPlatformConnection",
  localField: "connectionId",
  foreignField: "_id",
  justOne: true,
});

PlatformMeetingRecordSchema.virtual("meeting", {
  ref: "Meeting",
  localField: "meetingId",
  foreignField: "_id",
  justOne: true,
});
