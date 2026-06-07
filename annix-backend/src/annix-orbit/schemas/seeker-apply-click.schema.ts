import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerApplyClickDocument = HydratedDocument<SeekerApplyClick>;

@Schema({
  collection: "cv_assistant_seeker_apply_clicks",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerApplyClick {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: Number, required: false })
  externalJobId: number;

  @Prop({ type: Number, required: false })
  matchId: number;

  @Prop({ type: String, required: false })
  sourceUrl: string;

  @Prop({ type: String, required: false })
  status: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Boolean, default: false })
  dismissed: boolean;

  // Snapshot of the job at apply time — preserves the application after the
  // external job leaves the board.
  @Prop({ type: String, default: null })
  jobTitle: string | null;

  @Prop({ type: String, default: null })
  jobCompany: string | null;

  @Prop({ type: String, default: null })
  jobLocation: string | null;

  @Prop({ type: Number, default: null })
  jobSalaryMin: number | null;

  @Prop({ type: Number, default: null })
  jobSalaryMax: number | null;

  @Prop({ type: String, default: null })
  jobSalaryCurrency: string | null;

  @Prop({ type: String, required: false })
  clickedAt: string;
}

export const SeekerApplyClickSchema = SchemaFactory.createForClass(SeekerApplyClick);
