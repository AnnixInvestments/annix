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

  @Prop({ type: String, required: true, default: "MANUFACTURER" })
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

  @Prop({ type: String, required: true, default: "annix" })
  brandingType: string;

  @Prop({ type: Boolean, required: true, default: false })
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

  @Prop({ type: Buffer, required: false })
  smtpPassEncrypted: Buffer;

  @Prop({ type: String, required: false })
  smtpFromName: string;

  @Prop({ type: String, required: false })
  smtpFromEmail: string;

  @Prop({ type: [String], required: true, default: [] })
  notificationEmails: string[];

  @Prop({ type: Object, required: false })
  emailConfig: Record<string, unknown>;

  @Prop({ type: Number, required: true, default: 45 })
  pipingLossFactorPct: number;

  @Prop({ type: Number, required: true, default: 20 })
  flatPlateLossFactorPct: number;

  @Prop({ type: Number, required: true, default: 30 })
  structuralSteelLossFactorPct: number;

  @Prop({ type: Boolean, required: true, default: true })
  qcEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  messagingEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  staffLeaveEnabled: boolean;

  @Prop({ type: Boolean, required: true, default: true })
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

  @Prop({ type: String, required: true, default: "South Africa" })
  country: string;

  @Prop({ type: String, required: true, default: "ZAR" })
  currencyCode: string;

  @Prop({ type: Number, required: false })
  beeLevel: number;

  @Prop({ type: Date, required: false })
  beeCertificateExpiry: Date;

  @Prop({ type: String, required: false })
  beeVerificationAgency: string;

  @Prop({ type: Boolean, required: true, default: false })
  isExemptMicroEnterprise: boolean;

  @Prop({ type: Date, required: false })
  beeExpiryNotificationSentAt: Date;

  @Prop({ type: Boolean, required: true, default: false })
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
