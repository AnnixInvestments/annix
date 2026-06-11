import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InvoiceClarificationDocument = HydratedDocument<InvoiceClarification>;

@Schema({
  collection: "invoice_clarifications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InvoiceClarification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  invoiceId: number;

  @Prop({ type: String, required: false })
  invoiceItemId: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  clarificationType: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: Object, required: false })
  context: Record<string, unknown>;

  @Prop({ type: String, required: false })
  selectedStockItemId: string;

  @Prop({ type: Object, required: false })
  responseData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  answeredBy: string;

  @Prop({ type: Date, required: false })
  answeredAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedAnsweredBy: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  answeredByUserId: number;

  @Prop({ type: Number, required: false })
  unifiedAnsweredByUserId: number;
}

export const InvoiceClarificationSchema = SchemaFactory.createForClass(InvoiceClarification);

InvoiceClarificationSchema.virtual("invoice", {
  ref: "SupplierInvoice",
  localField: "invoiceId",
  foreignField: "_id",
  justOne: true,
});

InvoiceClarificationSchema.virtual("invoiceItem", {
  ref: "SupplierInvoiceItem",
  localField: "invoiceItemId",
  foreignField: "_id",
  justOne: true,
});

InvoiceClarificationSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

InvoiceClarificationSchema.virtual("selectedStockItem", {
  ref: "StockItem",
  localField: "selectedStockItemId",
  foreignField: "_id",
  justOne: true,
});

InvoiceClarificationSchema.virtual("answeredByUser", {
  ref: "StockControlUser",
  localField: "answeredByUserId",
  foreignField: "_id",
  justOne: true,
});

InvoiceClarificationSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

InvoiceClarificationSchema.virtual("unifiedAnsweredByUser", {
  ref: "User",
  localField: "unifiedAnsweredByUserId",
  foreignField: "_id",
  justOne: true,
});
