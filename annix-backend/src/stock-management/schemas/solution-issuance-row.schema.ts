import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SolutionIssuanceRowDocument = HydratedDocument<SolutionIssuanceRow>;

@Schema({
  collection: "sm_solution_issuance_row",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SolutionIssuanceRow {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  volumeL: number;

  @Prop({ type: Number, required: false })
  concentrationPct: number;

  @Prop({ type: String, required: false })
  batchNumber: string;
}

export const SolutionIssuanceRowSchema = SchemaFactory.createForClass(SolutionIssuanceRow);

SolutionIssuanceRowSchema.virtual("row", {
  ref: "IssuanceRow",
  localField: "rowId",
  foreignField: "_id",
  justOne: true,
});
