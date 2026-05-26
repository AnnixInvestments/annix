import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MeetingRecordingDocument = HydratedDocument<MeetingRecording>;

@Schema({
  collection: "annix_rep_meeting_recordings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MeetingRecording {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  meetingId: number;

  @Prop({ type: String, required: true })
  storagePath: string;

  @Prop({ type: String, required: true })
  storageBucket: string;

  @Prop({ type: String, required: false })
  originalFilename: string;

  @Prop({ type: String, required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  fileSizeBytes: number;

  @Prop({ type: Number, required: false })
  durationSeconds: number;

  @Prop({ type: Number, required: true })
  sampleRate: number;

  @Prop({ type: Number, required: true })
  channels: number;

  @Prop({ type: String, required: true })
  processingStatus: string;

  @Prop({ type: String, required: false })
  processingError: string;

  @Prop({ type: Object, required: false })
  speakerSegments: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  detectedSpeakersCount: number;

  @Prop({ type: Object, required: false })
  speakerLabels: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const MeetingRecordingSchema = SchemaFactory.createForClass(MeetingRecording);

MeetingRecordingSchema.virtual("meeting", {
  ref: "Meeting",
  localField: "meetingId",
  foreignField: "_id",
  justOne: true,
});
