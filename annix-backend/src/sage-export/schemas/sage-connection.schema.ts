import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SageConnectionDocument = HydratedDocument<SageConnection>;

@Schema({
  collection: "sage_connections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SageConnection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  appKey: string;

  @Prop({ type: String, required: false })
  sageUsername: string;

  @Prop({ type: Buffer, required: false })
  sagePassEncrypted: Buffer;

  @Prop({ type: String, required: false })
  accessTokenEncrypted: string;

  @Prop({ type: String, required: false })
  refreshTokenEncrypted: string;

  @Prop({ type: Date, required: false })
  tokenExpiresAt: Date;

  @Prop({ type: Date, required: false })
  refreshTokenExpiresAt: Date;

  @Prop({ type: Number, required: false })
  sageCompanyId: number;

  @Prop({ type: String, required: false })
  sageCompanyName: string;

  @Prop({ type: Boolean, required: true })
  enabled: boolean;

  @Prop({ type: Date, required: false })
  connectedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const SageConnectionSchema = SchemaFactory.createForClass(SageConnection);
