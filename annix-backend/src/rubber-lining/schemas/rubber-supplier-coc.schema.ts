import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberSupplierCocDocument = HydratedDocument<RubberSupplierCoc>;

@Schema({
  collection: "rubber_supplier_cocs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberSupplierCoc {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  cocType: string;

  @Prop({ type: Number, required: true })
  supplierCompanyId: number;

  @Prop({ type: String, required: true })
  documentPath: string;

  @Prop({ type: String, required: false })
  graphPdfPath: string;

  @Prop({ type: String, required: false })
  cocNumber: string;

  @Prop({ type: Date, required: false })
  productionDate: Date;

  @Prop({ type: String, required: false })
  compoundCode: string;

  @Prop({ type: String, required: false })
  orderNumber: string;

  @Prop({ type: String, required: false })
  ticketNumber: string;

  @Prop({ type: String, required: true })
  processingStatus: string;

  @Prop({ type: Object, required: false })
  extractedData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  reviewNotes: string;

  @Prop({ type: String, required: false })
  approvedBy: string;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: Number, required: false })
  linkedDeliveryNoteId: number;

  @Prop({ type: Number, required: false })
  linkedCalenderRollCocId: number;

  @Prop({ type: Date, required: false })
  exportedToSageAt: Date;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: Number, required: false })
  previousVersionId: number;

  @Prop({ type: String, required: true })
  versionStatus: string;

  @Prop({ type: String, required: false })
  documentHash: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberSupplierCocSchema = SchemaFactory.createForClass(RubberSupplierCoc);

RubberSupplierCocSchema.virtual("supplierCompany", {
  ref: "RubberCompany",
  localField: "supplierCompanyId",
  foreignField: "_id",
  justOne: true,
});

RubberSupplierCocSchema.virtual("linkedCalenderRollCoc", {
  ref: "RubberSupplierCoc",
  localField: "linkedCalenderRollCocId",
  foreignField: "_id",
  justOne: true,
});

RubberSupplierCocSchema.virtual("previousVersion", {
  ref: "RubberSupplierCoc",
  localField: "previousVersionId",
  foreignField: "_id",
  justOne: true,
});
