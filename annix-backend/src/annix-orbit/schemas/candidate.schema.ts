import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CandidateDocument = HydratedDocument<Candidate>;

@Schema({
  collection: "cv_assistant_candidates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Candidate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  email: string;

  @Prop({ type: String, required: false })
  name: string;

  @Prop({ type: String, required: false })
  cvFilePath: string;

  @Prop({ type: String, required: false })
  rawCvText: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  matchAnalysis: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  matchScore: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false, default: null })
  decisionSource: string | null;

  @Prop({ type: String, required: false })
  sourceEmailId: string;

  @Prop({ type: Number, required: false })
  beeLevel: number;

  @Prop({ type: Boolean, required: false, default: false })
  popiaConsent: boolean;

  @Prop({ type: Date, required: false })
  popiaConsentedAt: Date;

  @Prop({ type: Date, required: false })
  lastActiveAt: Date;

  @Prop({ type: Boolean, required: false, default: false })
  jobAlertsOptIn: boolean;

  @Prop({ type: Date, required: false })
  rejectionSentAt: Date;

  @Prop({ type: Boolean, required: false, default: false })
  isTestFixture: boolean;

  @Prop({ type: Object, required: false })
  workProfile: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  locationLat: number;

  @Prop({ type: Number, required: false })
  locationLon: number;

  @Prop({ type: Date, required: false })
  acceptanceSentAt: Date;

  @Prop({ type: Number, required: false })
  jobPostingId: number | null;

  @Prop({ type: Buffer, required: false })
  embedding: Buffer;

  @Prop({ type: String, required: false })
  embeddingTextHash: string;

  @Prop({ type: String, required: false })
  matchTier: string;

  @Prop({ type: [String], required: false })
  targetCategories: string[];

  @Prop({ type: [String], required: false })
  targetCountries: string[];

  @Prop({ type: String, required: false })
  trialTier: string;

  @Prop({ type: Date, required: false })
  trialEndsAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CandidateSchema = SchemaFactory.createForClass(Candidate);

CandidateSchema.virtual("jobPosting", {
  ref: "JobPosting",
  localField: "jobPostingId",
  foreignField: "_id",
  justOne: true,
});

CandidateSchema.virtual("references", {
  ref: "CandidateReference",
  localField: "_id",
  foreignField: "candidateId",
  justOne: false,
});
