import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelProfileDocument = HydratedDocument<AnnixSentinelProfile>;

@Schema({
  collection: "comply_sa_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Date, required: false })
  termsAcceptedAt: Date | null;

  @Prop({ type: String, required: false })
  termsVersion: string | null;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixSentinelProfileSchema = SchemaFactory.createForClass(AnnixSentinelProfile);
