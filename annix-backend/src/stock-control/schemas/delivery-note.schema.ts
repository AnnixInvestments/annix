import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DeliveryNoteDocument = HydratedDocument<DeliveryNote>;

@Schema({
  collection: "delivery_notes",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DeliveryNote {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  deliveryNumber: string;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: String, required: false })
  supplierId: string;

  @Prop({ type: Date, required: false })
  receivedDate: Date;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: String, required: false })
  receivedBy: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  sdnStatus: string;

  @Prop({ type: String, required: false })
  extractionStatus: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const DeliveryNoteSchema = SchemaFactory.createForClass(DeliveryNote);

DeliveryNoteSchema.virtual("supplier", {
  ref: "StockControlSupplier",
  localField: "supplierId",
  foreignField: "_id",
  justOne: true,
});

DeliveryNoteSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

DeliveryNoteSchema.virtual("items", {
  ref: "DeliveryNoteItem",
  localField: "_id",
  foreignField: "deliveryNoteId",
  justOne: false,
});

DeliveryNoteSchema.virtual("invoices", {
  ref: "SupplierInvoice",
  localField: "_id",
  foreignField: "deliveryNoteId",
  justOne: false,
});

DeliveryNoteSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
