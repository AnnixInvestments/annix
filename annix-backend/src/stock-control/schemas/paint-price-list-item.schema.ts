import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PaintPriceListItemDocument = HydratedDocument<PaintPriceListItem>;

@Schema({
  collection: "paint_price_list_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaintPriceListItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: String, required: false })
  coatType: string;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, required: false })
  paintType: string;

  @Prop({ type: String, required: false })
  genericType: string;

  @Prop({ type: String, required: false })
  finishType: string;

  @Prop({ type: Boolean, required: true, default: false })
  zincRich: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  mioPigment: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  surfaceTolerant: boolean;

  @Prop({ type: Number, required: false })
  heatResistanceC: number;

  @Prop({ type: Number, required: false })
  packSizeLitres: number;

  @Prop({ type: Number, required: true })
  volumeSolidsPercent: number;

  @Prop({ type: Number, required: true })
  costPerLitre: number;

  @Prop({ type: Number, required: false })
  costPerKit: number;

  @Prop({ type: Number, required: true, default: 0 })
  upliftPercent: number;

  @Prop({ type: Number, required: false })
  recommendedMicrons: number;

  @Prop({ type: Number, required: false })
  micronsOverride: number;

  @Prop({ type: String, required: false })
  thinnerName: string;

  @Prop({ type: Number, required: false })
  thinnerPricePerLitre: number;

  @Prop({ type: Number, required: false })
  maxThinningPercent: number;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  preferred: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PaintPriceListItemSchema = SchemaFactory.createForClass(PaintPriceListItem);

PaintPriceListItemSchema.index({ companyId: 1, supplierName: 1, productName: 1 });
