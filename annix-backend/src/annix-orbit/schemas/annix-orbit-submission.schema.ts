import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { AnnixOrbitSubmissionStatus } from "../entities/annix-orbit-submission.entity";

export type AnnixOrbitSubmissionDocument = HydratedDocument<AnnixOrbitSubmission>;

@Schema({
  collection: "orbit_submissions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitSubmission {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: Number, required: false })
  clientId: number;

  @Prop({ type: String, required: true })
  jobTitle: string;

  @Prop({ type: String, required: false, default: "submitted" })
  status: AnnixOrbitSubmissionStatus;

  @Prop({ type: String, required: false })
  submittedAt: string;

  @Prop({ type: String, required: false })
  feedback: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixOrbitSubmissionSchema = SchemaFactory.createForClass(AnnixOrbitSubmission);
