import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitTalentCredentialDocument = HydratedDocument<AnnixOrbitTalentCredential>;

@Schema({
  collection: "orbit_talent_credentials",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitTalentCredential {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: String, required: true })
  credentialType: string;

  @Prop({ type: Date, required: false })
  issuedAt: Date;

  @Prop({ type: Date, required: false })
  expiresAt: Date;

  @Prop({ type: String, required: false })
  issuingAuthority: string;

  @Prop({ type: String, required: false })
  documentPath: string;

  @Prop({ type: Boolean, required: false, default: false })
  verified: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixOrbitTalentCredentialSchema = SchemaFactory.createForClass(
  AnnixOrbitTalentCredential,
);
