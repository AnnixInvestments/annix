import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AffiliatePriceListDocument = HydratedDocument<AffiliatePriceList>;

@Schema({
  collection: "rubber_affiliate_price_lists",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AffiliatePriceList {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false, default: null })
  affiliateId: number | null;

  @Prop({ type: String, required: true })
  originalFilename: string;

  @Prop({ type: String, required: true })
  storagePath: string;

  @Prop({ type: String, required: true, default: "PENDING" })
  status: string;

  @Prop({ type: Number, required: true, default: 0 })
  itemCount: number;

  @Prop({ type: String, required: true })
  uploadedBy: string;

  @Prop({ type: Date, required: false })
  uploadedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AffiliatePriceListSchema = SchemaFactory.createForClass(AffiliatePriceList);
