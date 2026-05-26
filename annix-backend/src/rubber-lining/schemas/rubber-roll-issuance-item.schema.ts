import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberRollIssuanceItemDocument = HydratedDocument<RubberRollIssuanceItem>;

@Schema({
  collection: "rubber_roll_issuance_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberRollIssuanceItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  issuanceId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  jcNumber: string;

  @Prop({ type: String, required: false })
  jobName: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const RubberRollIssuanceItemSchema = SchemaFactory.createForClass(RubberRollIssuanceItem);

RubberRollIssuanceItemSchema.virtual("issuance", {
  ref: "RubberRollIssuance",
  localField: "issuanceId",
  foreignField: "_id",
  justOne: true,
});

RubberRollIssuanceItemSchema.virtual("lineItems", {
  ref: "RubberRollIssuanceLineItem",
  localField: "_id",
  foreignField: "issuanceItemId",
  justOne: false,
});
