import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SyncConflictDocument = HydratedDocument<SyncConflict>;

@Schema({
  collection: "annix_rep_sync_conflicts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SyncConflict {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: false })
  meetingId: string;

  @Prop({ type: String, required: false })
  calendarEventId: string;

  @Prop({ type: String, required: true })
  conflictType: string;

  @Prop({ type: Object, required: true })
  localData: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  remoteData: Record<string, unknown>;

  @Prop({ type: String, required: true })
  resolution: string;

  @Prop({ type: Date, required: false })
  resolvedAt: Date;

  @Prop({ type: String, required: false })
  resolvedById: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const SyncConflictSchema = SchemaFactory.createForClass(SyncConflict);

SyncConflictSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

SyncConflictSchema.virtual("meeting", {
  ref: "Meeting",
  localField: "meetingId",
  foreignField: "_id",
  justOne: true,
});

SyncConflictSchema.virtual("calendarEvent", {
  ref: "CalendarEvent",
  localField: "calendarEventId",
  foreignField: "_id",
  justOne: true,
});

SyncConflictSchema.virtual("resolvedBy", {
  ref: "User",
  localField: "resolvedById",
  foreignField: "_id",
  justOne: true,
});
