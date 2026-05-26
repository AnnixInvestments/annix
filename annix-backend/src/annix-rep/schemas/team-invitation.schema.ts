import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TeamInvitationDocument = HydratedDocument<TeamInvitation>;

@Schema({
  collection: "annix_rep_team_invitations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TeamInvitation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  organizationId: number;

  @Prop({ type: Number, required: true })
  invitedById: number;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: false })
  inviteeName: string;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String, required: false })
  territoryId: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  message: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  acceptedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const TeamInvitationSchema = SchemaFactory.createForClass(TeamInvitation);

TeamInvitationSchema.virtual("organization", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});

TeamInvitationSchema.virtual("invitedBy", {
  ref: "User",
  localField: "invitedById",
  foreignField: "_id",
  justOne: true,
});

TeamInvitationSchema.virtual("territory", {
  ref: "Territory",
  localField: "territoryId",
  foreignField: "_id",
  justOne: true,
});
