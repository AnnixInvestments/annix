import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InterviewInviteDocument = HydratedDocument<InterviewInvite>;

@Schema({
  collection: "cv_assistant_interview_invites",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InterviewInvite {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: Number, required: true })
  jobPostingId: number;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  usedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const InterviewInviteSchema = SchemaFactory.createForClass(InterviewInvite);

InterviewInviteSchema.virtual("candidate", {
  ref: "Candidate",
  localField: "candidateId",
  foreignField: "_id",
  justOne: true,
});

InterviewInviteSchema.virtual("jobPosting", {
  ref: "JobPosting",
  localField: "jobPostingId",
  foreignField: "_id",
  justOne: true,
});
