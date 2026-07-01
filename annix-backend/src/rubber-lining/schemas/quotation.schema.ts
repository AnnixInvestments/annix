import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { QuotationItem, QuotationItemSchema } from "./quotation-item.schema";

export type QuotationDocument = HydratedDocument<Quotation>;

@Schema({
  collection: "rubber_quotations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Quotation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: String, required: false })
  customerAddress: string;

  @Prop({ type: String, required: false })
  customerPhone: string;

  @Prop({ type: String, required: false })
  customerEmail: string;

  @Prop({ type: String, required: false })
  customerVatNumber: string;

  @Prop({ type: String, required: true, default: "Unpaid" })
  status: string;

  @Prop({ type: Number, required: true, default: 0 })
  profit: number;

  @Prop({ type: Date, required: false })
  validTo: Date;

  @Prop({ type: Number, required: false })
  affiliateId: number;

  @Prop({ type: [QuotationItemSchema], required: true })
  items: QuotationItem[];

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, required: true })
  vatTotal: number;

  @Prop({ type: Number, required: true })
  grandTotal: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const QuotationSchema = SchemaFactory.createForClass(Quotation);
