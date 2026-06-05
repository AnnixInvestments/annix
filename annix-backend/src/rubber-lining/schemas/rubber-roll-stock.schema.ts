import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberRollStockDocument = HydratedDocument<RubberRollStock>;

@Schema({
  collection: "rubber_roll_stock",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberRollStock {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  rollNumber: string;

  @Prop({ type: Number, required: false })
  compoundCodingId: number;

  @Prop({ type: Number, required: true })
  weightKg: number;

  @Prop({ type: Number, required: false })
  widthMm: number;

  @Prop({ type: Number, required: false })
  thicknessMm: number;

  @Prop({ type: Number, required: false })
  lengthM: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Object, required: true })
  linkedBatchIds: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  deliveryNoteItemId: number;

  @Prop({ type: Number, required: false })
  soldToCompanyId: number;

  @Prop({ type: Number, required: false })
  auCocId: number;

  @Prop({ type: String, required: false })
  reservedBy: string;

  @Prop({ type: Date, required: false })
  reservedAt: Date;

  @Prop({ type: Date, required: false })
  soldAt: Date;

  @Prop({ type: String, required: false })
  location: string;

  @Prop({ type: Number, required: false })
  locationId: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Number, required: false })
  costZar: number;

  @Prop({ type: Number, required: false })
  tollCostR: number;

  @Prop({ type: Number, required: false })
  compoundCostR: number;

  @Prop({ type: Number, required: false })
  totalCostR: number;

  @Prop({ type: Number, required: false })
  priceZar: number;

  @Prop({ type: Date, required: false })
  productionDate: Date;

  @Prop({ type: Number, required: false })
  supplierTaxInvoiceId: number;

  @Prop({ type: Number, required: false })
  supplierTaxInvoiceLineIdx: number;

  @Prop({ type: Number, required: false })
  customerTaxInvoiceId: number;

  @Prop({ type: Number, required: false })
  customerDeliveryNoteId: number;

  @Prop({ type: Number, required: false })
  supplierDeliveryNoteId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  stockLocationId: number;
}

export const RubberRollStockSchema = SchemaFactory.createForClass(RubberRollStock);

RubberRollStockSchema.virtual("compoundCoding", {
  ref: "RubberProductCoding",
  localField: "compoundCodingId",
  foreignField: "_id",
  justOne: true,
});

RubberRollStockSchema.virtual("soldToCompany", {
  ref: "RubberCompany",
  localField: "soldToCompanyId",
  foreignField: "_id",
  justOne: true,
});

RubberRollStockSchema.virtual("stockLocation", {
  ref: "RubberStockLocation",
  localField: "stockLocationId",
  foreignField: "_id",
  justOne: true,
});
