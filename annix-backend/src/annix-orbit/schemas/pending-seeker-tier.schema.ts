import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PendingSeekerTierDocument = HydratedDocument<PendingSeekerTier>;

@Schema({
  collection: "cv_assistant_pending_seeker_tiers",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PendingSeekerTier {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  emailNormalized: string;

  @Prop({ type: String, required: true })
  tier: string;

  @Prop({ type: Boolean, default: false })
  permanent: boolean;

  @Prop({ type: Number, required: false, default: null })
  trialDays: number | null;

  @Prop({ type: Date, required: false, default: null })
  trialGrantedAt: Date | null;
}

export const PendingSeekerTierSchema = SchemaFactory.createForClass(PendingSeekerTier);
