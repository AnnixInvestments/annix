import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TeamActivityDocument = HydratedDocument<TeamActivity>;

@Schema({
  collection: "annix_rep_team_activities",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TeamActivity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  organizationId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  activityType: string;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: Number, required: false })
  entityId: number;

  @Prop({ type: Object, required: false })
  metadata: Record<string, unknown>;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Boolean, required: true })
  isVisibleToTeam: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const TeamActivitySchema = SchemaFactory.createForClass(TeamActivity);

TeamActivitySchema.virtual("organization", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});

TeamActivitySchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
