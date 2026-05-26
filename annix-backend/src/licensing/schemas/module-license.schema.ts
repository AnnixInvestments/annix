import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ModuleLicenseDocument = HydratedDocument<ModuleLicense>;

@Schema({
  collection: "module_license",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ModuleLicense {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  moduleKey: string;

  @Prop({ type: String, required: true })
  tier: string;

  @Prop({ type: Object, default: {} })
  featureOverrides: Record<string, boolean>;

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

export const ModuleLicenseSchema = SchemaFactory.createForClass(ModuleLicense);
