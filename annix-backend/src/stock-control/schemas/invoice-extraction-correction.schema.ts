import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InvoiceExtractionCorrectionDocument = HydratedDocument<InvoiceExtractionCorrection>;

@Schema({
  collection: "invoice_extraction_corrections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InvoiceExtractionCorrection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: Number, required: true })
  invoiceItemId: number;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: String, required: false })
  originalValue: string;

  @Prop({ type: String, required: true })
  correctedValue: string;

  @Prop({ type: String, required: false })
  extractedDescription: string;

  @Prop({ type: String, required: false })
  correctedBy: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedCorrectedBy: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: Number, required: false })
  correctedByUserId: number;

  @Prop({ type: Number, required: false })
  unifiedCorrectedByUserId: number;
}

export const InvoiceExtractionCorrectionSchema = SchemaFactory.createForClass(
  InvoiceExtractionCorrection,
);

InvoiceExtractionCorrectionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

InvoiceExtractionCorrectionSchema.virtual("invoiceItem", {
  ref: "SupplierInvoiceItem",
  localField: "invoiceItemId",
  foreignField: "_id",
  justOne: true,
});

InvoiceExtractionCorrectionSchema.virtual("correctedByUser", {
  ref: "StockControlUser",
  localField: "correctedByUserId",
  foreignField: "_id",
  justOne: true,
});

InvoiceExtractionCorrectionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

InvoiceExtractionCorrectionSchema.virtual("unifiedCorrectedByUser", {
  ref: "User",
  localField: "unifiedCorrectedByUserId",
  foreignField: "_id",
  justOne: true,
});
