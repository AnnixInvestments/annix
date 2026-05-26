import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MeetingDocument = HydratedDocument<Meeting>;

@Schema({
  collection: "annix_rep_meetings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Meeting {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  prospectId: string;

  @Prop({ type: Number, required: true })
  salesRepId: number;

  @Prop({ type: String, required: false })
  calendarEventId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: true })
  meetingType: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: true })
  scheduledStart: Date;

  @Prop({ type: Date, required: true })
  scheduledEnd: Date;

  @Prop({ type: Date, required: false })
  actualStart: Date;

  @Prop({ type: Date, required: false })
  actualEnd: Date;

  @Prop({ type: String, required: false })
  location: string;

  @Prop({ type: Number, required: false })
  latitude: number;

  @Prop({ type: Number, required: false })
  longitude: number;

  @Prop({ type: [String], required: false })
  attendees: string;

  @Prop({ type: String, required: false })
  agenda: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  outcomes: string;

  @Prop({ type: Object, required: false })
  actionItems: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  summarySent: boolean;

  @Prop({ type: Date, required: false })
  summarySentAt: Date;

  @Prop({ type: String, required: false })
  crmExternalId: string;

  @Prop({ type: String, required: false })
  crmSyncStatus: string;

  @Prop({ type: Date, required: false })
  crmLastSyncedAt: Date;

  @Prop({ type: Boolean, required: true })
  isRecurring: boolean;

  @Prop({ type: String, required: false })
  recurrenceRule: string;

  @Prop({ type: String, required: false })
  recurringParentId: string;

  @Prop({ type: String, required: false })
  recurrenceExceptionDates: string;

  @Prop({ type: String, required: false })
  organizationId: string;

  @Prop({ type: Boolean, required: true })
  notesVisibleToTeam: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);

MeetingSchema.virtual("prospect", {
  ref: "Prospect",
  localField: "prospectId",
  foreignField: "_id",
  justOne: true,
});

MeetingSchema.virtual("salesRep", {
  ref: "User",
  localField: "salesRepId",
  foreignField: "_id",
  justOne: true,
});

MeetingSchema.virtual("calendarEvent", {
  ref: "CalendarEvent",
  localField: "calendarEventId",
  foreignField: "_id",
  justOne: true,
});

MeetingSchema.virtual("recurringParent", {
  ref: "Meeting",
  localField: "recurringParentId",
  foreignField: "_id",
  justOne: true,
});

MeetingSchema.virtual("organization", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});
