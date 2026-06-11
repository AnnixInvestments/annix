import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberTaxInvoiceCorrectionDocument = HydratedDocument<RubberTaxInvoiceCorrection>;

@Schema({
  collection: "rubber_tax_invoice_corrections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberTaxInvoiceCorrection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  taxInvoiceId: number;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: String, required: false })
  originalValue: string;

  @Prop({ type: String, required: true })
  correctedValue: string;

  @Prop({ type: String, required: false })
  correctedBy: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const RubberTaxInvoiceCorrectionSchema = SchemaFactory.createForClass(
  RubberTaxInvoiceCorrection,
);

RubberTaxInvoiceCorrectionSchema.virtual("taxInvoice", {
  ref: "RubberTaxInvoice",
  localField: "taxInvoiceId",
  foreignField: "_id",
  justOne: true,
});
