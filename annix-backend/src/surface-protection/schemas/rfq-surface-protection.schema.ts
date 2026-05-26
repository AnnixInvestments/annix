import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RfqSurfaceProtectionDocument = HydratedDocument<RfqSurfaceProtection>;

@Schema({
  collection: "rfq_surface_protection",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RfqSurfaceProtection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  rfqId: number;

  @Prop({ type: Boolean, required: true })
  externalCoatingRequired: boolean;

  @Prop({ type: String, required: false })
  externalCoatingType: string;

  @Prop({ type: String, required: false })
  externalSystemCode: string;

  @Prop({ type: String, required: false })
  externalSystemDescription: string;

  @Prop({ type: String, required: false })
  iso12944Category: string;

  @Prop({ type: String, required: false })
  iso12944Durability: string;

  @Prop({ type: Number, required: false })
  externalTotalDftUm: number;

  @Prop({ type: String, required: false })
  surfacePrepStandard: string;

  @Prop({ type: Boolean, required: true })
  internalLiningRequired: boolean;

  @Prop({ type: String, required: false })
  internalLiningType: string;

  @Prop({ type: Number, required: false })
  internalLiningThicknessMm: number;

  @Prop({ type: String, required: false })
  internalLiningDescription: string;

  @Prop({ type: String, required: false })
  rubberGrade: string;

  @Prop({ type: Number, required: false })
  rubberHardnessIrhd: number;

  @Prop({ type: String, required: false })
  ceramicTileType: string;

  @Prop({ type: String, required: false })
  substrateType: string;

  @Prop({ type: String, required: false })
  applicationMethod: string;

  @Prop({ type: String, required: false })
  applicationLocation: string;

  @Prop({ type: Number, required: false })
  applicationTempC: number;

  @Prop({ type: Number, required: false })
  applicationHumidityPercent: number;

  @Prop({ type: Object, required: false })
  inspectionRequirements: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  totalInternalAreaM2: number;

  @Prop({ type: Number, required: false })
  totalExternalAreaM2: number;

  @Prop({ type: Number, required: false })
  wastagePercent: number;

  @Prop({ type: Number, required: false })
  totalPaintLiters: number;

  @Prop({ type: Number, required: false })
  totalRubberM2: number;

  @Prop({ type: Number, required: false })
  totalCeramicTiles: number;

  @Prop({ type: Number, required: false })
  externalCoatingCost: number;

  @Prop({ type: Number, required: false })
  internalLiningCost: number;

  @Prop({ type: Number, required: false })
  surfacePrepCost: number;

  @Prop({ type: Number, required: false })
  totalSpCost: number;

  @Prop({ type: Number, required: false })
  marginPercent: number;

  @Prop({ type: Boolean, required: true })
  isConfirmed: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Object, required: false })
  specificationData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RfqSurfaceProtectionSchema = SchemaFactory.createForClass(RfqSurfaceProtection);

RfqSurfaceProtectionSchema.virtual("rfq", {
  ref: "Rfq",
  localField: "rfqId",
  foreignField: "_id",
  justOne: true,
});
