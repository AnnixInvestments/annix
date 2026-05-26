import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationRecommendationSnapshotDocument =
  HydratedDocument<EducationRecommendationSnapshot>;

@Schema({
  collection: "orbit_education_recommendation_snapshots",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationRecommendationSnapshot {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: false })
  educationProfileId: string;

  @Prop({ type: String, required: true })
  programmeId: string;

  @Prop({ type: Number, required: true })
  intakeYear: number;

  @Prop({ type: String, required: false })
  requirementVersionId: string;

  @Prop({ type: String, required: true })
  band: string;

  @Prop({ type: Object, required: true })
  result: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const EducationRecommendationSnapshotSchema = SchemaFactory.createForClass(
  EducationRecommendationSnapshot,
);
