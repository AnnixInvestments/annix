import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SocialCredentialDocument = HydratedDocument<SocialCredential>;

@Schema({
  collection: "social_credentials",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SocialCredential {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  platform: string;

  @Prop({ type: String, required: true })
  accessTokenEnc: string;

  @Prop({ type: String, required: false, default: null })
  refreshTokenEnc: string | null;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false, default: null })
  refreshExpiresAt: Date | null;

  @Prop({ type: String, required: false, default: null })
  scope: string | null;

  @Prop({ type: String, required: false, default: null })
  authorUrn: string | null;

  @Prop({ type: String, required: false, default: null })
  connectedBy: string | null;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const SocialCredentialSchema = SchemaFactory.createForClass(SocialCredential);
