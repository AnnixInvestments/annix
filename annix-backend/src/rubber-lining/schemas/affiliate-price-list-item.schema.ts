import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AffiliatePriceListItemDocument = HydratedDocument<AffiliatePriceListItem>;

@Schema({
  collection: "rubber_affiliate_price_list_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AffiliatePriceListItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  priceListId: number;

  @Prop({ type: String, required: true })
  productCode: string;

  @Prop({ type: String, required: false })
  productDescription: string;

  @Prop({ type: String, required: false })
  elongation: string;

  @Prop({ type: Number, required: false })
  sg: number;

  @Prop({ type: String, required: false })
  mpa: string;

  @Prop({ type: String, required: false })
  colour: string;

  @Prop({ type: String, required: false })
  cureType: string;

  @Prop({ type: Number, required: true })
  minPrice: number;

  @Prop({ type: String, required: true, default: "each" })
  unit: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AffiliatePriceListItemSchema = SchemaFactory.createForClass(AffiliatePriceListItem);
