import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCostRateDocument = HydratedDocument<RubberCostRate>;

@Schema({
  collection: "rubber_cost_rates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCostRate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  rateType: string;

  @Prop({ type: Number, required: true })
  costPerKgZar: number;

  @Prop({ type: Number, required: false })
  compoundCodingId: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  updatedBy: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberCostRateSchema = SchemaFactory.createForClass(RubberCostRate);

RubberCostRateSchema.virtual("compoundCoding", {
  ref: "RubberProductCoding",
  localField: "compoundCodingId",
  foreignField: "_id",
  justOne: true,
});
