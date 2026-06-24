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

  @Prop({ type: Object, required: false })
  address: {
    streetAddress: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
  };

  @Prop({ type: Object, required: false })
  contact: {
    phone: string | null;
    email: string | null;
  };

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

  @Prop({ type: Object, required: false })
  actionPermissions: Record<string, string[]>;

  @Prop({ type: Object, required: false })
  rbacConfig: Record<string, string[]>;

  @Prop({ type: [Object], required: false })
  workflowStepConfigs: Record<string, unknown>[];
  updatedAt: Date;
}

export const StockControlCompanySchema = SchemaFactory.createForClass(StockControlCompany);
