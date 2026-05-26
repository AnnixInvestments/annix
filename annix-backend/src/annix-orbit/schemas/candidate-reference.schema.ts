import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CandidateReferenceDocument = HydratedDocument<CandidateReference>;

@Schema({
  collection: "cv_assistant_candidate_references",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CandidateReference {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: false })
  relationship: string;

  @Prop({ type: String, required: true })
  feedbackToken: string;

  @Prop({ type: Date, required: true })
  tokenExpiresAt: Date;

  @Prop({ type: Number, required: false })
  feedbackRating: number;

  @Prop({ type: String, required: false })
  feedbackText: string;

  @Prop({ type: Date, required: false })
  feedbackSubmittedAt: Date;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: false })
  requestSentAt: Date;

  @Prop({ type: Date, required: false })
  reminderSentAt: Date;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CandidateReferenceSchema = SchemaFactory.createForClass(CandidateReference);

CandidateReferenceSchema.virtual("candidate", {
  ref: "Candidate",
  localField: "candidateId",
  foreignField: "_id",
  justOne: true,
});
