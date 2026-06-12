import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type {
  AnnixOrbitCandidateVisibility,
  AnnixOrbitTalentCandidateStatus,
} from "../entities/annix-orbit-talent-candidate.entity";

export type AnnixOrbitTalentCandidateDocument = HydratedDocument<AnnixOrbitTalentCandidate>;

@Schema({
  collection: "orbit_talent_candidates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitTalentCandidate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  ownerUserId: number;

  @Prop({ type: String, required: false, default: "agency" })
  visibility: AnnixOrbitCandidateVisibility;

  @Prop({ type: String, required: true })
  fullName: string;

  @Prop({ type: String, required: false })
  email: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: String, required: false })
  currentRole: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  city: string;

  @Prop({ type: Number, required: false })
  yearsExperience: number;

  @Prop({ type: [String], required: false })
  skills: string[];

  @Prop({ type: Number, required: false })
  salaryExpectation: number;

  @Prop({ type: String, required: false })
  availability: string;

  @Prop({ type: String, required: false })
  noticePeriod: string;

  @Prop({ type: Boolean, required: false, default: false })
  willingToRelocate: boolean;

  @Prop({ type: String, required: false, default: "active" })
  status: AnnixOrbitTalentCandidateStatus;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  cvText: string;

  @Prop({ type: String, required: false })
  cvFilePath: string;

  @Prop({ type: [Number], required: false })
  embedding: number[];

  @Prop({ type: Boolean, required: false, default: false })
  consentToShare: boolean;

  @Prop({ type: String, required: false })
  consentGivenAt: string;

  @Prop({ type: String, required: false })
  consentSource: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixOrbitTalentCandidateSchema =
  SchemaFactory.createForClass(AnnixOrbitTalentCandidate);
