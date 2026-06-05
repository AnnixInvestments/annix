import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CompanyModuleLicenseDocument = HydratedDocument<CompanyModuleLicense>;

@Schema({
  collection: "sm_company_module_license",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CompanyModuleLicense {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  moduleKey: string;

  @Prop({ type: String, required: true })
  tier: string;

  @Prop({ type: Object, required: true })
  featureOverrides: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  validFrom: Date;

  @Prop({ type: Date, required: false })
  validUntil: Date;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CompanyModuleLicenseSchema = SchemaFactory.createForClass(CompanyModuleLicense);
