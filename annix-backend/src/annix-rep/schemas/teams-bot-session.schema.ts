import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TeamsBotSessionDocument = HydratedDocument<TeamsBotSession>;

@Schema({
  collection: "annix_rep_teams_bot_sessions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TeamsBotSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: false })
  meetingId: string;

  @Prop({ type: String, required: true })
  sessionId: string;

  @Prop({ type: String, required: false })
  callId: string;

  @Prop({ type: String, required: true })
  meetingUrl: string;

  @Prop({ type: String, required: false })
  meetingThreadId: string;

  @Prop({ type: String, required: false })
  meetingOrganizerId: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: true })
  botDisplayName: string;

  @Prop({ type: String, required: false })
  errorMessage: string;

  @Prop({ type: Object, required: false })
  participants: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  participantCount: number;

  @Prop({ type: Object, required: true })
  transcriptEntries: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  transcriptEntryCount: number;

  @Prop({ type: Date, required: false })
  startedAt: Date;

  @Prop({ type: Date, required: false })
  endedAt: Date;

  @Prop({ type: Date, required: false })
  lastActivityAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const TeamsBotSessionSchema = SchemaFactory.createForClass(TeamsBotSession);

TeamsBotSessionSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

TeamsBotSessionSchema.virtual("meeting", {
  ref: "Meeting",
  localField: "meetingId",
  foreignField: "_id",
  justOne: true,
});
