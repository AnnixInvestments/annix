import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberRollIssuanceRowDocument = HydratedDocument<RubberRollIssuanceRow>;

@Schema({
  collection: "sm_rubber_roll_issuance_row",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberRollIssuanceRow {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  rowId: number;

  @Prop({ type: Number, required: true })
  weightKgIssued: number;

  @Prop({ type: Number, required: false })
  issuedWidthMm: number;

  @Prop({ type: Number, required: false })
  issuedLengthM: number;

  @Prop({ type: Number, required: false })
  issuedThicknessMm: number;

  @Prop({ type: Object, required: false })
  expectedReturnDimensions: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;
}

export const RubberRollIssuanceRowSchema = SchemaFactory.createForClass(RubberRollIssuanceRow);

RubberRollIssuanceRowSchema.virtual("row", {
  ref: "IssuanceRow",
  localField: "rowId",
  foreignField: "_id",
  justOne: true,
});
