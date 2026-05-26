import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SpSurfacePrepRateDocument = HydratedDocument<SpSurfacePrepRate>;

@Schema({
  collection: "sp_surface_prep_rates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SpSurfacePrepRate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  rateCode: string;

  @Prop({ type: String, required: true })
  methodName: string;

  @Prop({ type: String, required: true })
  prepGrade: string;

  @Prop({ type: String, required: true })
  prepMethod: string;

  @Prop({ type: String, required: true })
  substrateMaterial: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: false })
  minProfileUm: number;

  @Prop({ type: Number, required: false })
  maxProfileUm: number;

  @Prop({ type: Number, required: true })
  pricePerM2: number;

  @Prop({ type: Number, required: false })
  abrasiveCostPerM2: number;

  @Prop({ type: Number, required: true })
  shopMultiplier: number;

  @Prop({ type: Number, required: true })
  fieldMultiplier: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: Number, required: false })
  supplierId: number;

  @Prop({ type: Date, required: false })
  effectiveFrom: Date;

  @Prop({ type: Date, required: false })
  effectiveTo: Date;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const SpSurfacePrepRateSchema = SchemaFactory.createForClass(SpSurfacePrepRate);
