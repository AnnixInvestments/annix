import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationConsentDocument = HydratedDocument<EducationConsent>;

@Schema({
  collection: "orbit_education_consents",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationConsent {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  educationProfileId: string;

  @Prop({ type: Number, required: false })
  consentTextVersionId: number;

  @Prop({ type: String, required: true })
  jurisdiction: string;

  @Prop({ type: Number, required: true })
  grantedByUserId: number;

  @Prop({ type: String, required: true })
  grantedByRole: string;

  @Prop({ type: Date, required: true })
  grantedAt: Date;

  @Prop({ type: Date, required: false })
  revokedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const EducationConsentSchema = SchemaFactory.createForClass(EducationConsent);
