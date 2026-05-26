import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ConsumableProductDocument = HydratedDocument<ConsumableProduct>;

@Schema({
  collection: "sm_consumable_product",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ConsumableProduct {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const ConsumableProductSchema = SchemaFactory.createForClass(ConsumableProduct);

ConsumableProductSchema.virtual("product", {
  ref: "IssuableProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
