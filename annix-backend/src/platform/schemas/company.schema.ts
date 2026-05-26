import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CompanyDocument = HydratedDocument<Company>;

@Schema({
  collection: "companies",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Company {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  companyType: string;

  @Prop({ type: String, required: false })
  registrationNumber: string;

  @Prop({ type: String, required: false })
  customerCode: string;

  @Prop({ type: String, required: false })
  vatNumber: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: String, required: false })
  email: string;

  @Prop({ type: String, required: false })
  contactPerson: string;

  @Prop({ type: String, required: false })
  streetAddress: string;

  @Prop({ type: String, required: false })
  city: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  postalCode: string;

  @Prop({ type: Object, required: false })
  addressJsonb: Record<string, unknown>;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  websiteUrl: string;

  @Prop({ type: String, required: true })
  brandingType: string;

  @Prop({ type: Boolean, required: true })
  brandingAuthorized: boolean;

  @Prop({ type: String, required: false })
  primaryColor: string;

  @Prop({ type: String, required: false })
  accentColor: string;

  @Prop({ type: String, required: false })
  logoUrl: string;

  @Prop({ type: String, required: false })
  heroImageUrl: string;

  @Prop({ type: String, required: false })
  smtpHost: string;

  @Prop({ type: Number, required: false })
  smtpPort: number;

  @Prop({ type: String, required: false })
  smtpUser: string;

  @Prop({ type: String, required: false })
  smtpPassEncrypted: string;

  @Prop({ type: String, required: false })
  smtpFromName: string;

  @Prop({ type: String, required: false })
  smtpFromEmail: string;

  @Prop({ type: Object, required: true })
  notificationEmails: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  emailConfig: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  pipingLossFactorPct: number;

  @Prop({ type: Number, required: true })
  flatPlateLossFactorPct: number;

  @Prop({ type: Number, required: true })
  structuralSteelLossFactorPct: number;

  @Prop({ type: Boolean, required: true })
  qcEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  messagingEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  staffLeaveEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  workflowEnabled: boolean;

  @Prop({ type: String, required: false })
  firebaseUid: string;

  @Prop({ type: String, required: false })
  tradingName: string;

  @Prop({ type: String, required: false })
  legalName: string;

  @Prop({ type: String, required: false })
  industry: string;

  @Prop({ type: String, required: false })
  companySize: string;

  @Prop({ type: String, required: true })
  country: string;

  @Prop({ type: String, required: true })
  currencyCode: string;

  @Prop({ type: Number, required: false })
  beeLevel: number;

  @Prop({ type: Date, required: false })
  beeCertificateExpiry: Date;

  @Prop({ type: String, required: false })
  beeVerificationAgency: string;

  @Prop({ type: Boolean, required: true })
  isExemptMicroEnterprise: boolean;

  @Prop({ type: Date, required: false })
  beeExpiryNotificationSentAt: Date;

  @Prop({ type: Boolean, required: true })
  onboardingComplete: boolean;

  @Prop({ type: Number, required: false })
  ownerUserId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

CompanySchema.virtual("moduleSubscriptions", {
  ref: "CompanyModuleSubscription",
  localField: "_id",
  foreignField: "companyId",
  justOne: false,
});

CompanySchema.virtual("contacts", {
  ref: "Contact",
  localField: "_id",
  foreignField: "companyId",
  justOne: false,
});
