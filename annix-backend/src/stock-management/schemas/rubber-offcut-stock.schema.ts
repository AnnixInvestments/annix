import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberOffcutStockDocument = HydratedDocument<RubberOffcutStock>;

@Schema({
  collection: "sm_rubber_offcut_stock",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberOffcutStock {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  offcutNumber: string;

  @Prop({ type: Number, required: false })
  sourceRollId: number;

  @Prop({ type: Number, required: false })
  sourcePurchaseBatchId: number;

  @Prop({ type: Number, required: false })
  sourceIssuanceRowId: number;

  @Prop({ type: String, required: false })
  compoundCode: string;

  @Prop({ type: Number, required: false })
  compoundId: number;

  @Prop({ type: String, required: false })
  colour: string;

  @Prop({ type: Number, required: true })
  widthMm: number;

  @Prop({ type: Number, required: true })
  lengthM: number;

  @Prop({ type: Number, required: true })
  thicknessMm: number;

  @Prop({ type: Number, required: false })
  computedWeightKg: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: false })
  locationId: number;

  @Prop({ type: Date, required: true })
  receivedAt: Date;

  @Prop({ type: Number, required: false })
  receivedByStaffId: number;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: Date, required: false })
  lastCountedAt: Date;

  @Prop({ type: Number, required: false })
  lastCountedByStaffId: number;

  @Prop({ type: Object, required: false })
  lastCountedVariance: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  writtenOffAt: Date;

  @Prop({ type: Number, required: false })
  writtenOffByStaffId: number;

  @Prop({ type: String, required: false })
  writeOffReason: string;

  @Prop({ type: String, required: false })
  notes: string;
}

export const RubberOffcutStockSchema = SchemaFactory.createForClass(RubberOffcutStock);

RubberOffcutStockSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
