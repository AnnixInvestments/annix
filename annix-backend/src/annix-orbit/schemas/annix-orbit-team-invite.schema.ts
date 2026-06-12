import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { AnnixOrbitRecruiterRole } from "../entities/annix-orbit-profile.entity";
import type { AnnixOrbitTeamInviteStatus } from "../entities/annix-orbit-team-invite.entity";

export type AnnixOrbitTeamInviteDocument = HydratedDocument<AnnixOrbitTeamInvite>;

@Schema({
  collection: "orbit_team_invites",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitTeamInvite {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  recruiterRole: AnnixOrbitRecruiterRole;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: Number, required: true })
  invitedByUserId: number;

  @Prop({ type: String, required: false, default: "pending" })
  status: AnnixOrbitTeamInviteStatus;

  @Prop({ type: String, required: false })
  expiresAt: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitTeamInviteSchema = SchemaFactory.createForClass(AnnixOrbitTeamInvite);
