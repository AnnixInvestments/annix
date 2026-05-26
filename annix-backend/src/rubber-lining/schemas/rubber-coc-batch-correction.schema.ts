import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCocBatchCorrectionDocument = HydratedDocument<RubberCocBatchCorrection>;

@Schema({
  collection: "rubber_coc_batch_corrections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCocBatchCorrection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  supplierCocId: number;

  @Prop({ type: Number, required: true })
  compoundBatchId: number;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: String, required: false })
  compoundCode: string;

  @Prop({ type: String, required: true })
  batchNumber: string;

  @Prop({ type: String, required: true })
  fieldName: string;

  @Prop({ type: String, required: false })
  originalValue: string;

  @Prop({ type: String, required: true })
  correctedValue: string;

  @Prop({ type: String, required: false })
  correctedBy: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const RubberCocBatchCorrectionSchema =
  SchemaFactory.createForClass(RubberCocBatchCorrection);

RubberCocBatchCorrectionSchema.virtual("supplierCoc", {
  ref: "RubberSupplierCoc",
  localField: "supplierCocId",
  foreignField: "_id",
  justOne: true,
});

RubberCocBatchCorrectionSchema.virtual("compoundBatch", {
  ref: "RubberCompoundBatch",
  localField: "compoundBatchId",
  foreignField: "_id",
  justOne: true,
});
