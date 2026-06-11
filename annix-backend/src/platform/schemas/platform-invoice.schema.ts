import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PlatformInvoiceDocument = HydratedDocument<PlatformInvoice>;

@Schema({
  collection: "platform_invoices",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PlatformInvoice {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  sourceModule: string;

  @Prop({ type: String, required: true })
  invoiceType: string;

  @Prop({ type: String, required: true })
  invoiceNumber: string;

  @Prop({ type: Date, required: false })
  invoiceDate: Date;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: Number, required: false })
  supplierContactId: number;

  @Prop({ type: Number, required: false })
  totalAmount: number;

  @Prop({ type: Number, required: false })
  vatAmount: number;

  @Prop({ type: String, required: false })
  documentPath: string;

  @Prop({ type: String, required: true })
  extractionStatus: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  approvedBy: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: Date, required: false })
  exportedToSageAt: Date;

  @Prop({ type: Number, required: false })
  sageInvoiceId: number;

  @Prop({ type: Date, required: false })
  postedToSageAt: Date;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Object, required: false })
  linkedDeliveryNoteIds: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: Number, required: false })
  previousVersionId: number;

  @Prop({ type: String, required: true })
  versionStatus: string;

  @Prop({ type: String, required: false })
  firebaseUid: string;

  @Prop({ type: Number, required: false })
  legacyScInvoiceId: number;

  @Prop({ type: Number, required: false })
  legacyRubberInvoiceId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PlatformInvoiceSchema = SchemaFactory.createForClass(PlatformInvoice);

PlatformInvoiceSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

PlatformInvoiceSchema.virtual("supplierContact", {
  ref: "Contact",
  localField: "supplierContactId",
  foreignField: "_id",
  justOne: true,
});
