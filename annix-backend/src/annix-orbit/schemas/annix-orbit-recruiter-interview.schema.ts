import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type {
  AnnixOrbitInterviewStatus,
  AnnixOrbitInterviewType,
} from "../entities/annix-orbit-recruiter-interview.entity";

export type AnnixOrbitRecruiterInterviewDocument = HydratedDocument<AnnixOrbitRecruiterInterview>;

@Schema({
  collection: "orbit_recruiter_interviews",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitRecruiterInterview {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  candidateId: number;

  @Prop({ type: Number, required: false })
  clientId: number;

  @Prop({ type: String, required: true })
  candidateName: string;

  @Prop({ type: String, required: false })
  jobTitle: string;

  @Prop({ type: String, required: false })
  scheduledAt: string;

  @Prop({ type: String, required: false, default: "video" })
  interviewType: AnnixOrbitInterviewType;

  @Prop({ type: String, required: false, default: "scheduled" })
  status: AnnixOrbitInterviewStatus;

  @Prop({ type: String, required: false })
  feedback: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitRecruiterInterviewSchema = SchemaFactory.createForClass(
  AnnixOrbitRecruiterInterview,
);
