import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CalendarEventDocument = HydratedDocument<CalendarEvent>;

@Schema({
  collection: "annix_rep_calendar_events",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CalendarEvent {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  connectionId: number;

  @Prop({ type: String, required: true })
  externalId: string;

  @Prop({ type: String, required: false })
  calendarId: string;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Date, required: true })
  startTime: Date;

  @Prop({ type: Date, required: true })
  endTime: Date;

  @Prop({ type: Boolean, required: true })
  isAllDay: boolean;

  @Prop({ type: String, required: false })
  timezone: string;

  @Prop({ type: String, required: false })
  location: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: [String], required: false })
  attendees: string;

  @Prop({ type: String, required: false })
  organizerEmail: string;

  @Prop({ type: String, required: false })
  meetingUrl: string;

  @Prop({ type: Boolean, required: true })
  isRecurring: boolean;

  @Prop({ type: String, required: false })
  recurrenceRule: string;

  @Prop({ type: Object, required: false })
  rawData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  etag: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CalendarEventSchema = SchemaFactory.createForClass(CalendarEvent);

CalendarEventSchema.virtual("connection", {
  ref: "CalendarConnection",
  localField: "connectionId",
  foreignField: "_id",
  justOne: true,
});
