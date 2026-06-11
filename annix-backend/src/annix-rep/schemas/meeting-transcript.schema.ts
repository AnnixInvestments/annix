import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MeetingTranscriptDocument = HydratedDocument<MeetingTranscript>;

@Schema({
  collection: "annix_rep_meeting_transcripts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MeetingTranscript {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  recordingId: number;

  @Prop({ type: String, required: true })
  fullText: string;

  @Prop({ type: Object, required: true })
  segments: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  wordCount: number;

  @Prop({ type: Object, required: false })
  analysis: Record<string, unknown>;

  @Prop({ type: String, required: false })
  summary: string;

  @Prop({ type: String, required: false })
  whisperModel: string;

  @Prop({ type: String, required: true })
  language: string;

  @Prop({ type: Number, required: false })
  processingTimeMs: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const MeetingTranscriptSchema = SchemaFactory.createForClass(MeetingTranscript);

MeetingTranscriptSchema.virtual("recording", {
  ref: "MeetingRecording",
  localField: "recordingId",
  foreignField: "_id",
  justOne: true,
});
