import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationRequirementVersionDocument = HydratedDocument<EducationRequirementVersion>;

@Schema({
  collection: "orbit_education_requirement_versions",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationRequirementVersion {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  programmeId: string;

  @Prop({ type: Number, required: true })
  intakeYear: number;

  @Prop({ type: Object, required: true })
  spec: Record<string, unknown>;

  @Prop({ type: String, required: true })
  validFrom: string;

  @Prop({ type: String, required: false })
  validTo: string;

  @Prop({ type: String, required: true })
  confidence: string;

  @Prop({ type: String, required: true })
  verificationStatus: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const EducationRequirementVersionSchema = SchemaFactory.createForClass(
  EducationRequirementVersion,
);
