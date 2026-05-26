import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CalendarConnectionDocument = HydratedDocument<CalendarConnection>;

@Schema({
  collection: "annix_rep_calendar_connections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CalendarConnection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: true })
  accountEmail: string;

  @Prop({ type: String, required: false })
  accountName: string;

  @Prop({ type: String, required: true })
  accessTokenEncrypted: string;

  @Prop({ type: String, required: false })
  refreshTokenEncrypted: string;

  @Prop({ type: Date, required: false })
  tokenExpiresAt: Date;

  @Prop({ type: String, required: false })
  caldavUrl: string;

  @Prop({ type: String, required: true })
  syncStatus: string;

  @Prop({ type: Date, required: false })
  lastSyncAt: Date;

  @Prop({ type: String, required: false })
  lastSyncError: string;

  @Prop({ type: String, required: false })
  syncToken: string;

  @Prop({ type: [String], required: false })
  selectedCalendars: string;

  @Prop({ type: Boolean, required: true })
  isPrimary: boolean;

  @Prop({ type: String, required: true })
  displayColor: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CalendarConnectionSchema = SchemaFactory.createForClass(CalendarConnection);

CalendarConnectionSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

CalendarConnectionSchema.virtual("events", {
  ref: "CalendarEvent",
  localField: "_id",
  foreignField: "connectionId",
  justOne: false,
});
