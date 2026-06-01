import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { TierInviteStatus } from "../entities/tier-invite.entity";

export type TierInviteDocument = HydratedDocument<TierInvite>;

@Schema({ collection: "tier_invite", timestamps: true })
export class TierInvite {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  moduleKey: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  tierKey: string;

  @Prop({ type: Number, required: true })
  freeDays: number;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: String, required: true, default: "pending" })
  status: TierInviteStatus;

  @Prop({ type: Number, required: false })
  invitedById: number;

  @Prop({ type: Date, required: false })
  acceptedAt: Date;

  @Prop({ type: Date, required: false })
  expiresAt: Date;
}

export const TierInviteSchema = SchemaFactory.createForClass(TierInvite);
