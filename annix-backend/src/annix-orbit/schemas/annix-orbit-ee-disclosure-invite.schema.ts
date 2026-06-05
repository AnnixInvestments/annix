import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitEeDisclosureInviteDocument = HydratedDocument<AnnixOrbitEeDisclosureInvite>;

@Schema({
  collection: "cv_assistant_ee_disclosure_invites",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitEeDisclosureInvite {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: Number, required: true })
  jobPostingId: number;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  usedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const AnnixOrbitEeDisclosureInviteSchema = SchemaFactory.createForClass(
  AnnixOrbitEeDisclosureInvite,
);

AnnixOrbitEeDisclosureInviteSchema.virtual("candidate", {
  ref: "Candidate",
  localField: "candidateId",
  foreignField: "_id",
  justOne: true,
});

AnnixOrbitEeDisclosureInviteSchema.virtual("jobPosting", {
  ref: "JobPosting",
  localField: "jobPostingId",
  foreignField: "_id",
  justOne: true,
});
