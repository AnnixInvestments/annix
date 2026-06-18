import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PaintIssuanceRowDocument = HydratedDocument<PaintIssuanceRow>;

@Schema({
  collection: "sm_paint_issuance_row",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaintIssuanceRow {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  rowId: number;

  @Prop({ type: Number, required: true })
  litres: number;

  @Prop({ type: Number, required: false })
  coverageM2: number;

  @Prop({ type: Number, required: false })
  coatCount: number;

  @Prop({ type: Number, required: false })
  coatingAnalysisId: number;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: Object, required: false })
  cpoProRataSplit: Record<string, unknown>;
}

export const PaintIssuanceRowSchema = SchemaFactory.createForClass(PaintIssuanceRow);

PaintIssuanceRowSchema.virtual("row", {
  ref: "IssuanceRow",
  localField: "rowId",
  foreignField: "_id",
  justOne: true,
});
