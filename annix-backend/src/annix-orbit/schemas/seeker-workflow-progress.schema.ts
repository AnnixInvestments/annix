import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerWorkflowProgressDocument = HydratedDocument<SeekerWorkflowProgress>;

@Schema({
  collection: "cv_assistant_seeker_workflow_progress",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerWorkflowProgress {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  participantId: string;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: Date, required: false, default: null })
  registeredAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  cvUploadedAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  careerScoreGeneratedAt: Date | null;

  @Prop({ type: Date, required: false, default: null })
  firstJobsViewedAt: Date | null;

  @Prop({ type: Number, default: null })
  timeToFirstValueSeconds: number | null;

  @Prop({ type: Number, default: 0 })
  completedSteps: number;

  @Prop({ type: Date, required: false, default: null })
  lastActiveAt: Date | null;
}

export const SeekerWorkflowProgressSchema = SchemaFactory.createForClass(SeekerWorkflowProgress);
