import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberTaxInvoiceDocument = HydratedDocument<RubberTaxInvoice>;

@Schema({
  collection: "rubber_tax_invoices",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberTaxInvoice {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  invoiceNumber: string;

  @Prop({ type: Date, required: false })
  invoiceDate: Date;

  @Prop({ type: String, required: true })
  invoiceType: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  documentPath: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  totalAmount: number;

  @Prop({ type: Number, required: false })
  vatAmount: number;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Date, required: false })
  exportedToSageAt: Date;

  @Prop({ type: Number, required: false })
  sageInvoiceId: number;

  @Prop({ type: Date, required: false })
  postedToSageAt: Date;

  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: Number, required: false })
  previousVersionId: number;

  @Prop({ type: String, required: true })
  versionStatus: string;

  @Prop({ type: Boolean, required: true })
  isCreditNote: boolean;

  @Prop({ type: Number, required: false })
  originalInvoiceId: number;

  @Prop({ type: Object, required: true })
  creditNoteRollNumbers: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  linkedAuCocId: number;

  @Prop({ type: Number, required: false })
  linkedCalenderRollCocId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberTaxInvoiceSchema = SchemaFactory.createForClass(RubberTaxInvoice);

RubberTaxInvoiceSchema.virtual("company", {
  ref: "RubberCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

RubberTaxInvoiceSchema.virtual("previousVersion", {
  ref: "RubberTaxInvoice",
  localField: "previousVersionId",
  foreignField: "_id",
  justOne: true,
});

RubberTaxInvoiceSchema.virtual("originalInvoice", {
  ref: "RubberTaxInvoice",
  localField: "originalInvoiceId",
  foreignField: "_id",
  justOne: true,
});
