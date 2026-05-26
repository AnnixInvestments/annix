import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DnExtractionCorrectionDocument = HydratedDocument<DnExtractionCorrection>;

@Schema({
  collection: "dn_extraction_corrections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DnExtractionCorrection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  supplierName: string;

  @Prop({ type: Number, required: true })
  deliveryNoteId: number;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: String, required: false })
  originalValue: string;

  @Prop({ type: String, required: true })
  correctedValue: string;

  @Prop({ type: String, required: false })
  itemDescription: string;

  @Prop({ type: Number, required: false })
  itemIndex: number;

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

export const DnExtractionCorrectionSchema = SchemaFactory.createForClass(DnExtractionCorrection);

DnExtractionCorrectionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

DnExtractionCorrectionSchema.virtual("deliveryNote", {
  ref: "DeliveryNote",
  localField: "deliveryNoteId",
  foreignField: "_id",
  justOne: true,
});

DnExtractionCorrectionSchema.virtual("correctedByUser", {
  ref: "StockControlUser",
  localField: "correctedByUserId",
  foreignField: "_id",
  justOne: true,
});

DnExtractionCorrectionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

DnExtractionCorrectionSchema.virtual("unifiedCorrectedByUser", {
  ref: "User",
  localField: "unifiedCorrectedByUserId",
  foreignField: "_id",
  justOne: true,
});
