import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({
  collection: "annix_rep_organizations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Organization {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: Number, required: true })
  ownerId: number;

  @Prop({ type: String, required: true })
  plan: string;

  @Prop({ type: Number, required: true })
  maxMembers: number;

  @Prop({ type: String, required: false })
  industry: string;

  @Prop({ type: String, required: false })
  logoUrl: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.virtual("owner", {
  ref: "User",
  localField: "ownerId",
  foreignField: "_id",
  justOne: true,
});
