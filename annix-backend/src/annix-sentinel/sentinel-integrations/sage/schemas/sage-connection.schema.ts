import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelSageConnectionDocument = HydratedDocument<AnnixSentinelSageConnection>;

@Schema({
  collection: "comply_sa_sage_connections",
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelSageConnection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  accessTokenEncrypted: string;

  @Prop({ type: String, required: true })
  refreshTokenEncrypted: string;

  @Prop({ type: Date, required: true })
  tokenExpiresAt: Date;

  @Prop({ type: String, required: false })
  sageResourceOwnerId: string | null;

  @Prop({ type: Date, required: false })
  lastSyncAt: Date | null;

  @Prop({ type: Date, required: true })
  connectedAt: Date;
}

export const AnnixSentinelSageConnectionSchema = SchemaFactory.createForClass(
  AnnixSentinelSageConnection,
);
