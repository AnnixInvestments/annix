import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationRequirementDraftDocument = HydratedDocument<EducationRequirementDraft>;

@Schema({
  collection: "orbit_education_requirement_drafts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationRequirementDraft {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: false })
  institutionId: string;

  @Prop({ type: String, required: false })
  programmeId: string;

  @Prop({ type: Number, required: true })
  intakeYear: number;

  @Prop({ type: String, required: true })
  fieldKey: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Object, required: true })
  extractedValue: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  approvedValue: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  confidence: string;

  @Prop({ type: String, required: true })
  sourceUrl: string;

  @Prop({ type: String, required: false })
  screenshotPath: string;

  @Prop({ type: String, required: false })
  rawSnippet: string;

  @Prop({ type: Date, required: true })
  fetchedAt: Date;

  @Prop({ type: Number, required: false })
  approvedById: number;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const EducationRequirementDraftSchema =
  SchemaFactory.createForClass(EducationRequirementDraft);
