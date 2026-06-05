import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierInvoiceDocument = HydratedDocument<SupplierInvoice>;

@Schema({
  collection: "supplier_invoices",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierInvoice {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  deliveryNoteId: string;

  @Prop({ type: String, required: true })
  invoiceNumber: string;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: String, required: false })
  supplierId: string;

  @Prop({ type: Date, required: false })
  invoiceDate: Date;

  @Prop({ type: Number, required: false })
  totalAmount: number;

  @Prop({ type: Number, required: false })
  vatAmount: number;

  @Prop({ type: String, required: false })
  scanUrl: string;

  @Prop({ type: String, required: true })
  extractionStatus: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  approvedBy: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: Date, required: false })
  exportedToSageAt: Date;

  @Prop({ type: Object, required: false })
  linkedDeliveryNoteIds: Record<string, unknown>;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedApprovedBy: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  approvedByUserId: number;

  @Prop({ type: Number, required: false })
  unifiedApprovedByUserId: number;
}

export const SupplierInvoiceSchema = SchemaFactory.createForClass(SupplierInvoice);

SupplierInvoiceSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceSchema.virtual("deliveryNote", {
  ref: "DeliveryNote",
  localField: "deliveryNoteId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceSchema.virtual("supplier", {
  ref: "StockControlSupplier",
  localField: "supplierId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceSchema.virtual("approvedByUser", {
  ref: "StockControlUser",
  localField: "approvedByUserId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceSchema.virtual("items", {
  ref: "SupplierInvoiceItem",
  localField: "_id",
  foreignField: "invoiceId",
  justOne: false,
});

SupplierInvoiceSchema.virtual("clarifications", {
  ref: "InvoiceClarification",
  localField: "_id",
  foreignField: "invoiceId",
  justOne: false,
});

SupplierInvoiceSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

SupplierInvoiceSchema.virtual("unifiedApprovedByUser", {
  ref: "User",
  localField: "unifiedApprovedByUserId",
  foreignField: "_id",
  justOne: true,
});
