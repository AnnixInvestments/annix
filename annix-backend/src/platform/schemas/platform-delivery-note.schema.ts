import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PlatformDeliveryNoteDocument = HydratedDocument<PlatformDeliveryNote>;

@Schema({
  collection: "platform_delivery_notes",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PlatformDeliveryNote {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  sourceModule: string;

  @Prop({ type: String, required: true })
  deliveryNumber: string;

  @Prop({ type: String, required: true })
  deliveryNoteType: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: Number, required: false })
  supplierContactId: number;

  @Prop({ type: Date, required: false })
  deliveryDate: Date;

  @Prop({ type: String, required: false })
  customerReference: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  documentPath: string;

  @Prop({ type: String, required: false })
  receivedBy: string;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: String, required: false })
  extractionStatus: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  linkedCocId: number;

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

  @Prop({ type: String, required: false })
  firebaseUid: string;

  @Prop({ type: Number, required: false })
  legacyScDeliveryNoteId: number;

  @Prop({ type: Number, required: false })
  legacyRubberDeliveryNoteId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const PlatformDeliveryNoteSchema = SchemaFactory.createForClass(PlatformDeliveryNote);

PlatformDeliveryNoteSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

PlatformDeliveryNoteSchema.virtual("supplierContact", {
  ref: "Contact",
  localField: "supplierContactId",
  foreignField: "_id",
  justOne: true,
});

PlatformDeliveryNoteSchema.virtual("items", {
  ref: "DeliveryNoteItem",
  localField: "_id",
  foreignField: "deliveryNoteId",
  justOne: false,
});
