import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberBoardMeetingDocument = HydratedDocument<RubberBoardMeeting>;

@Schema({
  collection: "rubber_board_meetings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberBoardMeeting {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: Date, required: false })
  meetingDate: Date;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: false })
  externalId: string;

  @Prop({ type: String, required: false })
  recordingUrl: string;

  @Prop({ type: [String], required: false, default: () => [] })
  attendees: string[];

  @Prop({ type: String, required: false })
  providerSummary: string;

  @Prop({ type: String, required: false })
  transcriptPath: string;

  @Prop({ type: Object, required: false })
  minutes: Record<string, unknown>;

  @Prop({ type: String, required: true, default: "NONE" })
  minutesStatus: string;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberBoardMeetingSchema = SchemaFactory.createForClass(RubberBoardMeeting);
