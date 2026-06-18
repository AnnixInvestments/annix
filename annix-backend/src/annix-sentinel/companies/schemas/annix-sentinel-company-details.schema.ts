import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelCompanyDetailsDocument = HydratedDocument<AnnixSentinelCompanyDetails>;

@Schema({
  collection: "comply_sa_company_details",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelCompanyDetails {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true, default: "company" })
  entityType: string;

  @Prop({ type: Number, required: true, default: 0 })
  employeeCount: number;

  @Prop({ type: String, required: false })
  employeeCountRange: string | null;

  @Prop({ type: Number, required: false })
  annualTurnover: number | null;

  @Prop({ type: Number, required: false })
  financialYearEndMonth: number | null;

  @Prop({ type: String, required: false })
  municipality: string | null;

  @Prop({ type: String, required: false })
  sectorCode: string | null;

  @Prop({ type: Object, required: false })
  complianceAreas: Record<string, unknown> | null;

  @Prop({ type: Boolean, required: true, default: false })
  profileComplete: boolean;

  @Prop({ type: String, required: true, default: "free" })
  subscriptionTier: string;

  @Prop({ type: String, required: true, default: "trial" })
  subscriptionStatus: string;

  @Prop({ type: Boolean, required: true, default: false })
  importsExports: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  handlesPersonalData: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  hasPayroll: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  vatRegistered: boolean;

  @Prop({ type: String, required: false })
  vatSubmissionCycle: string | null;

  @Prop({ type: String, required: false })
  registrationDate: string | null;

  @Prop({ type: String, required: false })
  businessAddress: string | null;

  @Prop({ type: String, required: false })
  idNumber: string | null;

  @Prop({ type: String, required: false })
  passportNumber: string | null;

  @Prop({ type: String, required: false })
  passportCountry: string | null;

  @Prop({ type: String, required: false })
  sarsTaxReference: string | null;

  @Prop({ type: String, required: false })
  dateOfBirth: string | null;

  @Prop({ type: String, required: false })
  trustRegistrationNumber: string | null;

  @Prop({ type: String, required: false })
  mastersOffice: string | null;

  @Prop({ type: Number, required: false })
  trusteeCount: number | null;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AnnixSentinelCompanyDetailsSchema = SchemaFactory.createForClass(
  AnnixSentinelCompanyDetails,
);
