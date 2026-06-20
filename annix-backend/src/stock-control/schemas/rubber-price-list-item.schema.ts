import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberPriceListItemDocument = HydratedDocument<RubberPriceListItem>;

@Schema({
  collection: "rubber_price_list_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberPriceListItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  family: string;

  @Prop({ type: String, required: true })
  supplier: string;

  @Prop({ type: String, required: true })
  productCode: string;

  @Prop({ type: String, required: false, default: null })
  productName: string | null;

  @Prop({ type: String, required: false, default: null })
  bondingType: string | null;

  @Prop({ type: String, required: false, default: null })
  colour: string | null;

  @Prop({ type: Number, required: false, default: null })
  shoreHardness: number | null;

  @Prop({ type: Number, required: true })
  specificGravity: number;

  @Prop({ type: Number, required: false, default: null })
  costPerKg: number | null;

  @Prop({ type: Number, required: true, default: 0 })
  upliftPercent: number;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  preferred: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberPriceListItemSchema = SchemaFactory.createForClass(RubberPriceListItem);

RubberPriceListItemSchema.index({ companyId: 1, family: 1, supplier: 1, productCode: 1 });
