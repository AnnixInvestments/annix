import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationProgrammeOutcomeSignalDocument =
  HydratedDocument<EducationProgrammeOutcomeSignal>;

@Schema({
  collection: "orbit_education_programme_outcome_signals",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationProgrammeOutcomeSignal {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  programmeId: string;

  @Prop({ type: String, required: true })
  source: string;

  @Prop({ type: String, required: true })
  metric: string;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: String, required: false })
  asOf: string;

  @Prop({ type: String, required: true })
  confidence: string;

  @Prop({ type: String, required: true })
  verificationStatus: string;

  @Prop({ type: String, required: false })
  sourceUrl: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const EducationProgrammeOutcomeSignalSchema = SchemaFactory.createForClass(
  EducationProgrammeOutcomeSignal,
);
