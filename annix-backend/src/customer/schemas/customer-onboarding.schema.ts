import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerOnboardingDocument = HydratedDocument<CustomerOnboarding>;

@Schema({
  collection: "customer_onboarding",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerOnboarding {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  customerId: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Boolean, required: true })
  companyDetailsComplete: boolean;

  @Prop({ type: Boolean, required: true })
  documentsComplete: boolean;

  @Prop({ type: Boolean, required: false })
  documentsNeedReview: boolean;

  @Prop({ type: Date, required: false })
  submittedAt: Date;

  @Prop({ type: Date, required: false })
  reviewedAt: Date;

  @Prop({ type: String, required: false })
  reviewedById: string;

  @Prop({ type: String, required: false })
  rejectionReason: string;

  @Prop({ type: String, required: false })
  remediationSteps: string;

  @Prop({ type: Number, required: true })
  resubmissionCount: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CustomerOnboardingSchema = SchemaFactory.createForClass(CustomerOnboarding);

CustomerOnboardingSchema.virtual("customer", {
  ref: "CustomerProfile",
  localField: "customerId",
  foreignField: "_id",
  justOne: true,
});

CustomerOnboardingSchema.virtual("reviewedBy", {
  ref: "User",
  localField: "reviewedById",
  foreignField: "_id",
  justOne: true,
});
