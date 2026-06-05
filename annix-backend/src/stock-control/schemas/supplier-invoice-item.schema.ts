import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierInvoiceItemDocument = HydratedDocument<SupplierInvoiceItem>;

@Schema({
  collection: "supplier_invoice_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierInvoiceItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  invoiceId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  lineNumber: number;

  @Prop({ type: String, required: false })
  extractedDescription: string;

  @Prop({ type: String, required: false })
  extractedSku: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: false })
  unitPrice: number;

  @Prop({ type: String, required: false })
  unitType: string;

  @Prop({ type: Number, required: false })
  discountPercent: number;

  @Prop({ type: String, required: true })
  matchStatus: string;

  @Prop({ type: Number, required: false })
  matchConfidence: number;

  @Prop({ type: String, required: false })
  stockItemId: string;

  @Prop({ type: Boolean, required: true })
  isPartA: boolean;

  @Prop({ type: Boolean, required: true })
  isPartB: boolean;

  @Prop({ type: String, required: false })
  linkedItemId: string;

  @Prop({ type: Boolean, required: true })
  priceUpdated: boolean;

  @Prop({ type: Number, required: false })
  previousPrice: number;

  @Prop({ type: Object, required: false })
  rollNumbers: Record<string, unknown>;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const SupplierInvoiceItemSchema = SchemaFactory.createForClass(SupplierInvoiceItem);

SupplierInvoiceItemSchema.virtual("invoice", {
  ref: "SupplierInvoice",
  localField: "invoiceId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceItemSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceItemSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceItemSchema.virtual("linkedItem", {
  ref: "SupplierInvoiceItem",
  localField: "linkedItemId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceItemSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
