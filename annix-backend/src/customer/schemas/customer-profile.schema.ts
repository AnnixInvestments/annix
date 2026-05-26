import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerProfileDocument = HydratedDocument<CustomerProfile>;

@Schema({
  collection: "customer_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: false })
  jobTitle: string;

  @Prop({ type: String, required: false })
  directPhone: string;

  @Prop({ type: String, required: false })
  mobilePhone: string;

  @Prop({ type: Boolean, required: true })
  emailVerified: boolean;

  @Prop({ type: String, required: false })
  emailVerificationToken: string;

  @Prop({ type: Date, required: false })
  emailVerificationExpires: Date;

  @Prop({ type: String, required: false })
  suspensionReason: string;

  @Prop({ type: Date, required: false })
  suspendedAt: Date;

  @Prop({ type: Number, required: false })
  suspendedBy: number;

  @Prop({ type: Date, required: false })
  documentStorageAcceptedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  firstName: string;

  @Prop({ type: String, required: true })
  lastName: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String, required: true })
  accountStatus: string;

  @Prop({ type: Date, required: false })
  termsAcceptedAt: Date;

  @Prop({ type: Date, required: false })
  securityPolicyAcceptedAt: Date;

  @Prop({ type: Number, required: false })
  githubFeedbackIssueNumber: number;

  @Prop({ type: Number, required: false })
  onboardingId: number;
}

export const CustomerProfileSchema = SchemaFactory.createForClass(CustomerProfile);

CustomerProfileSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

CustomerProfileSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

CustomerProfileSchema.virtual("deviceBindings", {
  ref: "CustomerDeviceBinding",
  localField: "_id",
  foreignField: "customerProfileId",
  justOne: false,
});

CustomerProfileSchema.virtual("sessions", {
  ref: "CustomerSession",
  localField: "_id",
  foreignField: "customerProfileId",
  justOne: false,
});

CustomerProfileSchema.virtual("loginAttempts", {
  ref: "CustomerLoginAttempt",
  localField: "_id",
  foreignField: "customerProfileId",
  justOne: false,
});

CustomerProfileSchema.virtual("onboarding", {
  ref: "CustomerOnboarding",
  localField: "onboardingId",
  foreignField: "_id",
  justOne: true,
});

CustomerProfileSchema.virtual("documents", {
  ref: "CustomerDocument",
  localField: "_id",
  foreignField: "customerId",
  justOne: false,
});
