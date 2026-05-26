import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type GuardianLinkDocument = HydratedDocument<GuardianLink>;

@Schema({
  collection: "orbit_education_guardian_links",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class GuardianLink {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  educationProfileId: string;

  @Prop({ type: Number, required: false })
  guardianUserId: number;

  @Prop({ type: String, required: true })
  guardianEmail: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: true })
  invitedAt: Date;

  @Prop({ type: Date, required: false })
  acceptedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const GuardianLinkSchema = SchemaFactory.createForClass(GuardianLink);
