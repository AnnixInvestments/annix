import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SurfaceProtectionRfqDocument = HydratedDocument<SurfaceProtectionRfq>;

@Schema({
  collection: "surface_protection_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SurfaceProtectionRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  protectionType: string;

  @Prop({ type: String, required: true })
  substrateType: string;

  @Prop({ type: String, required: false })
  applicationMethod: string;

  @Prop({ type: String, required: true })
  applicationLocation: string;

  @Prop({ type: String, required: false })
  externalCoatingType: string;

  @Prop({ type: String, required: false })
  iso12944Category: string;

  @Prop({ type: String, required: false })
  iso12944Durability: string;

  @Prop({ type: String, required: false })
  externalSystemDescription: string;

  @Prop({ type: Number, required: false })
  externalTotalDftUm: number;

  @Prop({ type: Number, required: false })
  externalNumberOfCoats: number;

  @Prop({ type: String, required: false })
  surfacePrepStandard: string;

  @Prop({ type: String, required: false })
  internalLiningType: string;

  @Prop({ type: Number, required: false })
  internalLiningThicknessMm: number;

  @Prop({ type: String, required: false })
  internalSystemDescription: string;

  @Prop({ type: String, required: false })
  rubberGrade: string;

  @Prop({ type: Number, required: false })
  rubberHardnessIrhd: number;

  @Prop({ type: String, required: false })
  ceramicTileType: string;

  @Prop({ type: Number, required: false })
  ceramicTileThicknessMm: number;

  @Prop({ type: Number, required: false })
  internalSurfaceAreaM2: number;

  @Prop({ type: Number, required: false })
  externalSurfaceAreaM2: number;

  @Prop({ type: Number, required: false })
  totalSurfaceAreaM2: number;

  @Prop({ type: Number, required: false })
  wastagePercent: number;

  @Prop({ type: Number, required: false })
  paintQuantityLiters: number;

  @Prop({ type: Number, required: false })
  rubberQuantityM2: number;

  @Prop({ type: Number, required: false })
  ceramicTileCount: number;

  @Prop({ type: Number, required: false })
  adhesiveQuantityKg: number;

  @Prop({ type: Number, required: false })
  applicationTempC: number;

  @Prop({ type: Number, required: false })
  applicationHumidityPercent: number;

  @Prop({ type: Object, required: false })
  inspectionRequirements: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  externalPricePerM2: number;

  @Prop({ type: Number, required: false })
  internalPricePerM2: number;

  @Prop({ type: Number, required: false })
  surfacePrepPricePerM2: number;

  @Prop({ type: Number, required: false })
  externalTotalCost: number;

  @Prop({ type: Number, required: false })
  internalTotalCost: number;

  @Prop({ type: Number, required: false })
  totalCost: number;

  @Prop({ type: Number, required: false })
  marginPercent: number;

  @Prop({ type: Object, required: false })
  calculationData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  rfqItemId: number;
}

export const SurfaceProtectionRfqSchema = SchemaFactory.createForClass(SurfaceProtectionRfq);

SurfaceProtectionRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
