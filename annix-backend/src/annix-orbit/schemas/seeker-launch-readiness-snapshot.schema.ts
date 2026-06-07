import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerLaunchReadinessSnapshotDocument = HydratedDocument<SeekerLaunchReadinessSnapshot>;

@Schema({
  collection: "cv_assistant_seeker_readiness_snapshots",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerLaunchReadinessSnapshot {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  snapshotDate: string;

  @Prop({ type: Number, default: 0 })
  cvUploads: number;

  @Prop({ type: Number, default: 0 })
  completedProfiles: number;

  @Prop({ type: Number, default: 0 })
  successfulAnalyses: number;

  @Prop({ type: Number, default: 0 })
  jobViews: number;

  @Prop({ type: Number, default: 0 })
  applications: number;

  @Prop({ type: Number, default: 0 })
  errorRatePct: number;

  @Prop({ type: Number, default: null })
  avgTtfvSeconds: number | null;

  @Prop({ type: Number, default: 0 })
  openCriticalBugs: number;

  @Prop({ type: String, default: "Not Ready" })
  status: string;

  @Prop({ type: Boolean, default: false })
  readyForSoftLaunch: boolean;

  @Prop({ type: Boolean, default: false })
  readyForPublicLaunch: boolean;
}

export const SeekerLaunchReadinessSnapshotSchema = SchemaFactory.createForClass(
  SeekerLaunchReadinessSnapshot,
);
