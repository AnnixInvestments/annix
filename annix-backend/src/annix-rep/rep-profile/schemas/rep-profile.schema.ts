import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RepProfileDocument = HydratedDocument<RepProfile>;

@Schema({
  collection: "annix_rep_rep_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RepProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  industry: string;

  @Prop({ type: [String], required: true })
  subIndustries: string;

  @Prop({ type: [String], required: true })
  productCategories: string;

  @Prop({ type: String, required: false })
  companyName: string;

  @Prop({ type: String, required: false })
  jobTitle: string;

  @Prop({ type: String, required: false })
  territoryDescription: string;

  @Prop({ type: Number, required: false })
  defaultSearchLatitude: number;

  @Prop({ type: Number, required: false })
  defaultSearchLongitude: number;

  @Prop({ type: Number, required: true })
  defaultSearchRadiusKm: number;

  @Prop({ type: Object, required: false })
  targetCustomerProfile: Record<string, unknown>;

  @Prop({ type: [String], required: false })
  customSearchTerms: string;

  @Prop({ type: Boolean, required: true })
  setupCompleted: boolean;

  @Prop({ type: Date, required: false })
  setupCompletedAt: Date;

  @Prop({ type: Number, required: true })
  defaultBufferBeforeMinutes: number;

  @Prop({ type: Number, required: true })
  defaultBufferAfterMinutes: number;

  @Prop({ type: String, required: true })
  workingHoursStart: string;

  @Prop({ type: String, required: true })
  workingHoursEnd: string;

  @Prop({ type: String, required: true })
  workingDays: string;

  @Prop({ type: String, required: false })
  organizationId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RepProfileSchema = SchemaFactory.createForClass(RepProfile);

RepProfileSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

RepProfileSchema.virtual("organization", {
  ref: "Organization",
  localField: "organizationId",
  foreignField: "_id",
  justOne: true,
});
