import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerInterviewReminderDocument = HydratedDocument<SeekerInterviewReminder>;

@Schema({
  collection: "cv_assistant_seeker_interview_reminders",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerInterviewReminder {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: String, required: false })
  source: string;

  @Prop({ type: Number, required: false })
  sourceId: number;

  @Prop({ type: String, required: false })
  offset: string;

  @Prop({ type: Date, required: false })
  sentAt: Date;
}

export const SeekerInterviewReminderSchema = SchemaFactory.createForClass(SeekerInterviewReminder);
