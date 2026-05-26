import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitCandidateEeAttributesDocument =
  HydratedDocument<AnnixOrbitCandidateEeAttributes>;

@Schema({
  collection: "cv_assistant_candidate_ee_attributes",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitCandidateEeAttributes {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: String, required: true })
  populationGroup: string;

  @Prop({ type: String, required: true })
  gender: string;

  @Prop({ type: String, required: true })
  disabilityStatus: string;

  @Prop({ type: Boolean, required: true })
  requiresAccommodation: boolean;

  @Prop({ type: String, required: false })
  accommodationNotes: string;

  @Prop({ type: String, required: true })
  nationalityStatus: string;

  @Prop({ type: Number, required: true })
  consentTextVersionId: number;

  @Prop({ type: Date, required: true })
  consentGrantedAt: Date;

  @Prop({ type: String, required: true })
  consentSource: string;

  @Prop({ type: Object, required: true })
  purposes: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: Date, required: false })
  deletedAt: Date;
}

export const AnnixOrbitCandidateEeAttributesSchema = SchemaFactory.createForClass(
  AnnixOrbitCandidateEeAttributes,
);

AnnixOrbitCandidateEeAttributesSchema.virtual("candidate", {
  ref: "Candidate",
  localField: "candidateId",
  foreignField: "_id",
  justOne: true,
});

AnnixOrbitCandidateEeAttributesSchema.virtual("consentTextVersion", {
  ref: "AnnixOrbitEeConsentTextVersion",
  localField: "consentTextVersionId",
  foreignField: "_id",
  justOne: true,
});
