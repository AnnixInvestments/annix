import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CompanyProfileDocument = HydratedDocument<CompanyProfile>;

@Schema({
  collection: "admin_company_profile",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CompanyProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  legalName: string;

  @Prop({ type: String, required: true })
  tradingName: string;

  @Prop({ type: String, required: true })
  registrationNumber: string;

  @Prop({ type: String, required: false })
  vatNumber: string;

  @Prop({ type: String, required: false })
  entityType: string;

  @Prop({ type: String, required: false })
  streetAddress: string;

  @Prop({ type: String, required: false })
  city: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  postalCode: string;

  @Prop({ type: String, required: true })
  country: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: String, required: false })
  generalEmail: string;

  @Prop({ type: String, required: false })
  supportEmail: string;

  @Prop({ type: String, required: false })
  privacyEmail: string;

  @Prop({ type: String, required: false })
  demoRequestEmail: string;

  @Prop({ type: String, required: false })
  websiteUrl: string;

  @Prop({ type: String, required: false })
  informationOfficerName: string;

  @Prop({ type: String, required: false })
  informationOfficerEmail: string;

  @Prop({ type: String, required: true })
  jurisdiction: string;

  @Prop({ type: String, required: false })
  primaryDomain: string;

  @Prop({ type: String, required: false })
  noReplyEmail: string;

  @Prop({ type: String, required: false })
  mailerName: string;

  @Prop({ type: Object, required: true })
  directors: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CompanyProfileSchema = SchemaFactory.createForClass(CompanyProfile);
