import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelChecklistProgressDocument =
  HydratedDocument<AnnixSentinelChecklistProgress>;

@Schema({
  collection: "comply_sa_compliance_checklist_progress",
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelChecklistProgress {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  requirementId: number;

  @Prop({ type: Number, required: true })
  stepIndex: number;

  @Prop({ type: String, required: true })
  stepLabel: string;

  @Prop({ type: Boolean, required: true, default: false })
  completed: boolean;

  @Prop({ type: Date, required: false })
  completedAt: Date | null;

  @Prop({ type: Number, required: false })
  completedByUserId: number | null;

  @Prop({ type: String, required: false })
  notes: string | null;
}

export const AnnixSentinelChecklistProgressSchema = SchemaFactory.createForClass(
  AnnixSentinelChecklistProgress,
);
