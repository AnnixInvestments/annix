import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCompoundBatchDocument = HydratedDocument<RubberCompoundBatch>;

@Schema({
  collection: "rubber_compound_batches",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCompoundBatch {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: Number, required: true })
  supplierCocId: number;

  @Prop({ type: String, required: true })
  batchNumber: string;

  @Prop({ type: Number, required: false })
  compoundStockId: number;

  @Prop({ type: Number, required: false })
  shoreAHardness: number;

  @Prop({ type: Number, required: false })
  specificGravity: number;

  @Prop({ type: Number, required: false })
  reboundPercent: number;

  @Prop({ type: Number, required: false })
  tearStrengthKnM: number;

  @Prop({ type: Number, required: false })
  tensileStrengthMpa: number;

  @Prop({ type: Number, required: false })
  elongationPercent: number;

  @Prop({ type: Number, required: false })
  rheometerSMin: number;

  @Prop({ type: Number, required: false })
  rheometerSMax: number;

  @Prop({ type: Number, required: false })
  rheometerTs2: number;

  @Prop({ type: Number, required: false })
  rheometerTc90: number;

  @Prop({ type: String, required: false })
  passFailStatus: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberCompoundBatchSchema = SchemaFactory.createForClass(RubberCompoundBatch);

RubberCompoundBatchSchema.virtual("supplierCoc", {
  ref: "RubberSupplierCoc",
  localField: "supplierCocId",
  foreignField: "_id",
  justOne: true,
});

RubberCompoundBatchSchema.virtual("compoundStock", {
  ref: "RubberCompoundStock",
  localField: "compoundStockId",
  foreignField: "_id",
  justOne: true,
});
