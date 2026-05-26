import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ConsumableIssuanceRowDocument = HydratedDocument<ConsumableIssuanceRow>;

@Schema({
  collection: "sm_consumable_issuance_row",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ConsumableIssuanceRow {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: false })
  batchNumber: string;
}

export const ConsumableIssuanceRowSchema = SchemaFactory.createForClass(ConsumableIssuanceRow);

ConsumableIssuanceRowSchema.virtual("row", {
  ref: "IssuanceRow",
  localField: "rowId",
  foreignField: "_id",
  justOne: true,
});
