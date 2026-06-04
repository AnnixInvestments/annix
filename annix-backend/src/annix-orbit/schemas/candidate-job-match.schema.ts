import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CandidateJobMatchDocument = HydratedDocument<CandidateJobMatch>;

@Schema({
  collection: "cv_assistant_candidate_job_matches",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CandidateJobMatch {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: Number, required: true })
  externalJobId: number;

  @Prop({ type: Number, required: true })
  similarityScore: number;

  @Prop({ type: Number, required: true })
  structuredScore: number;

  @Prop({ type: Number, required: true })
  overallScore: number;

  @Prop({ type: Object, required: false })
  matchDetails: Record<string, unknown>;

  @Prop({ type: Boolean, required: true, default: false })
  dismissed: boolean;

  @Prop({ type: String, required: false, default: null })
  dismissReason: string | null;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CandidateJobMatchSchema = SchemaFactory.createForClass(CandidateJobMatch);

CandidateJobMatchSchema.virtual("candidate", {
  ref: "Candidate",
  localField: "candidateId",
  foreignField: "_id",
  justOne: true,
});

CandidateJobMatchSchema.virtual("externalJob", {
  ref: "ExternalJob",
  localField: "externalJobId",
  foreignField: "_id",
  justOne: true,
});
