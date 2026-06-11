import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CvCredentialDocument = HydratedDocument<CvCredential>;

@Schema({
  collection: "cv_assistant_credentials",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CvCredential {
  @Prop({ type: Number })
  _id: number;

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

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CvCredentialSchema = SchemaFactory.createForClass(CvCredential);
