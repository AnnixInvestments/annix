import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelApiKeyDocument = HydratedDocument<AnnixSentinelApiKey>;

@Schema({
  collection: "comply_sa_api_keys",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelApiKey {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  keyHash: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Date, required: false })
  lastUsedAt: Date | null;

  @Prop({ type: Date, required: false })
  expiresAt: Date | null;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const AnnixSentinelApiKeySchema = SchemaFactory.createForClass(AnnixSentinelApiKey);
