import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitEeConsentTextVersionDocument =
  HydratedDocument<AnnixOrbitEeConsentTextVersion>;

@Schema({
  collection: "cv_assistant_ee_consent_text_versions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitEeConsentTextVersion {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  versionLabel: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: Date, required: true })
  effectiveFrom: Date;

  @Prop({ type: Date, required: false })
  effectiveTo: Date;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const AnnixOrbitEeConsentTextVersionSchema = SchemaFactory.createForClass(
  AnnixOrbitEeConsentTextVersion,
);
