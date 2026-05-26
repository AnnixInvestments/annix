import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type {
  AddOnOverride,
  TierPricingOverride,
} from "../entities/module-catalog-override.entity";

export type ModuleCatalogOverrideDocument = HydratedDocument<ModuleCatalogOverride>;

@Schema({
  collection: "module_catalog_override",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ModuleCatalogOverride {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  moduleKey: string;

  @Prop({ type: Object, default: {} })
  tierOverrides: Record<string, TierPricingOverride>;

  @Prop({ type: Object, default: {} })
  tierFeatures: Record<string, string[]>;

  @Prop({ type: Object, default: {} })
  addOnOverrides: Record<string, AddOnOverride>;

  @Prop({ type: Number, required: false })
  updatedById: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const ModuleCatalogOverrideSchema = SchemaFactory.createForClass(ModuleCatalogOverride);
