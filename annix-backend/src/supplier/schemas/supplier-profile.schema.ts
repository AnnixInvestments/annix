import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierProfileDocument = HydratedDocument<SupplierProfile>;

@Schema({
  collection: "supplier_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierProfile {
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

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  companyId: number;

  @Prop({ type: String, required: false })
  firstName: string;

  @Prop({ type: String, required: false })
  lastName: string;

  @Prop({ type: String, required: true })
  accountStatus: string;

  @Prop({ type: Date, required: false })
  termsAcceptedAt: Date;

  @Prop({ type: Date, required: false })
  securityPolicyAcceptedAt: Date;

  @Prop({ type: Number, required: false })
  onboardingId: number;
}

export const SupplierProfileSchema = SchemaFactory.createForClass(SupplierProfile);

SupplierProfileSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

SupplierProfileSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

SupplierProfileSchema.virtual("deviceBindings", {
  ref: "SupplierDeviceBinding",
  localField: "_id",
  foreignField: "supplierProfileId",
  justOne: false,
});

SupplierProfileSchema.virtual("sessions", {
  ref: "SupplierSession",
  localField: "_id",
  foreignField: "supplierProfileId",
  justOne: false,
});

SupplierProfileSchema.virtual("loginAttempts", {
  ref: "SupplierLoginAttempt",
  localField: "_id",
  foreignField: "supplierProfileId",
  justOne: false,
});

SupplierProfileSchema.virtual("onboarding", {
  ref: "SupplierOnboarding",
  localField: "onboardingId",
  foreignField: "_id",
  justOne: true,
});

SupplierProfileSchema.virtual("documents", {
  ref: "SupplierDocument",
  localField: "_id",
  foreignField: "supplierId",
  justOne: false,
});

SupplierProfileSchema.virtual("capabilities", {
  ref: "SupplierCapability",
  localField: "_id",
  foreignField: "supplierProfileId",
  justOne: false,
});
