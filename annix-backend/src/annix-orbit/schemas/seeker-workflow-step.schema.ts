import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerWorkflowStepDocument = HydratedDocument<SeekerWorkflowStep>;

@Schema({
  collection: "cv_assistant_seeker_workflow_steps",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerWorkflowStep {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  participantId: string;

  @Prop({ type: String, required: true })
  stepKey: string;

  @Prop({ type: Boolean, default: false })
  completed: boolean;

  @Prop({ type: Date, required: false, default: null })
  completedAt: Date | null;

  @Prop({ type: Number, required: false, default: null })
  timeTakenSeconds: number | null;

  @Prop({ type: String, required: false, default: null })
  errorMessage: string | null;
}

export const SeekerWorkflowStepSchema = SchemaFactory.createForClass(SeekerWorkflowStep);
