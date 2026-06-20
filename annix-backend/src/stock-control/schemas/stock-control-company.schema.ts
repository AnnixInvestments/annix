import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlCompanyDocument = HydratedDocument<StockControlCompany>;

@Schema({
  collection: "stock_control_companies",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlCompany {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  brandingType: string;

  @Prop({ type: String, required: false })
  websiteUrl: string;

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
  registrationNumber: string;

  @Prop({ type: String, required: false })
  vatNumber: string;

  @Prop({ type: String, required: false })
  streetAddress: string;

  @Prop({ type: String, required: false })
  city: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  postalCode: string;

  @Prop({ type: String, required: false })
  phone: string;

  @Prop({ type: String, required: false })
  email: string;

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

  @Prop({ type: Object, required: true })
  notificationEmails: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  pipingLossFactorPct: number;

  @Prop({ type: Number, required: true })
  flatPlateLossFactorPct: number;

  @Prop({ type: Number, required: true })
  structuralSteelLossFactorPct: number;

  @Prop({ type: Object, required: false })
  paintPricingConfig: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  rubberPricingConfig: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  qcEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  messagingEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  staffLeaveEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  workflowEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  notificationsEnabled: boolean;

  @Prop({ type: String, required: false })
  sageUsername: string;

  @Prop({ type: Buffer, required: false })
  sagePassEncrypted: Buffer;

  @Prop({ type: Number, required: false })
  sageCompanyId: number;

  @Prop({ type: String, required: false })
  sageCompanyName: string;

  @Prop({ type: Date, required: false })
  sageConnectedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const StockControlCompanySchema = SchemaFactory.createForClass(StockControlCompany);
