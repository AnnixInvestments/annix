import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberDeliveryNoteDocument = HydratedDocument<RubberDeliveryNote>;

@Schema({
  collection: "rubber_delivery_notes",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberDeliveryNote {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  deliveryNoteType: string;

  @Prop({ type: String, required: true })
  deliveryNoteNumber: string;

  @Prop({ type: Date, required: false })
  deliveryDate: Date;

  @Prop({ type: String, required: false })
  customerReference: string;

  @Prop({ type: Number, required: true })
  supplierCompanyId: number;

  @Prop({ type: String, required: false })
  documentPath: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: false })
  linkedCocId: number;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: Number, required: false })
  previousVersionId: number;

  @Prop({ type: String, required: true })
  versionStatus: string;

  @Prop({ type: String, required: false })
  stockCategory: string;

  @Prop({ type: Object, required: false })
  podPageNumbers: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  sourcePageNumbers: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  siblingsBackfilledAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberDeliveryNoteSchema = SchemaFactory.createForClass(RubberDeliveryNote);

RubberDeliveryNoteSchema.virtual("supplierCompany", {
  ref: "RubberCompany",
  localField: "supplierCompanyId",
  foreignField: "_id",
  justOne: true,
});

RubberDeliveryNoteSchema.virtual("linkedCoc", {
  ref: "RubberSupplierCoc",
  localField: "linkedCocId",
  foreignField: "_id",
  justOne: true,
});

RubberDeliveryNoteSchema.virtual("previousVersion", {
  ref: "RubberDeliveryNote",
  localField: "previousVersionId",
  foreignField: "_id",
  justOne: true,
});
