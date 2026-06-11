import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TeamMemberDocument = HydratedDocument<TeamMember>;

@Schema({
  collection: "annix_rep_team_members",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TeamMember {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  organizationId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  reportsToId: string;

  @Prop({ type: Date, required: true })
  joinedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const TeamMemberSchema = SchemaFactory.createForClass(TeamMember);

TeamMemberSchema.virtual("organization", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});

TeamMemberSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

TeamMemberSchema.virtual("reportsTo", {
  ref: "User",
  localField: "reportsToId",
  foreignField: "_id",
  justOne: true,
});
