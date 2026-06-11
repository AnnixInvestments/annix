import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberRollIssuanceLineItemDocument = HydratedDocument<RubberRollIssuanceLineItem>;

@Schema({
  collection: "rubber_roll_issuance_line_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberRollIssuanceLineItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  issuanceItemId: number;

  @Prop({ type: Number, required: true })
  lineItemId: number;

  @Prop({ type: String, required: false })
  itemDescription: string;

  @Prop({ type: String, required: false })
  itemNo: string;

  @Prop({ type: Number, required: false })
  quantity: number;

  @Prop({ type: Number, required: false })
  m2: number;

  @Prop({ type: Number, required: false })
  estimatedWeightKg: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const RubberRollIssuanceLineItemSchema = SchemaFactory.createForClass(
  RubberRollIssuanceLineItem,
);

RubberRollIssuanceLineItemSchema.virtual("issuanceItem", {
  ref: "RubberRollIssuanceItem",
  localField: "issuanceItemId",
  foreignField: "_id",
  justOne: true,
});
