import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import type { OrbitTierFeatures } from "../entities/orbit-tier-capability.entity";

@Schema({ collection: "cv_assistant_tier_capabilities", timestamps: true })
export class OrbitTierCapability {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true, unique: true })
  tier: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, required: true })
  matchStrictness: string;

  @Prop({ type: Number, default: null })
  maxJobResults: number | null;

  @Prop({ type: Number, default: null })
  monthlyNixRuns: number | null;

  @Prop({ type: Object, required: true })
  features: OrbitTierFeatures;

  @Prop({ type: Number, default: 0 })
  displayOrder: number;
}

export const OrbitTierCapabilitySchema = SchemaFactory.createForClass(OrbitTierCapability);

export type OrbitTierCapabilityDocument = HydratedDocument<OrbitTierCapability>;
