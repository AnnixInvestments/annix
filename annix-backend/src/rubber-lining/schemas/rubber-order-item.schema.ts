import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberOrderItemDocument = HydratedDocument<RubberOrderItem>;

@Schema({
  collection: "rubber_order_item",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberOrderItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  orderId: number;

  @Prop({ type: String, required: false })
  productFirebaseUid: string;

  @Prop({ type: Number, required: false })
  productId: number;

  @Prop({ type: Number, required: false })
  thickness: number;

  @Prop({ type: Number, required: false })
  width: number;

  @Prop({ type: Number, required: false })
  length: number;

  @Prop({ type: Number, required: false })
  quantity: number;

  @Prop({ type: Number, required: false })
  cpoUnitPrice: number;

  @Prop({ type: Number, required: false })
  pricePerKg: number;

  @Prop({ type: Object, required: true })
  callOffs: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdByFirebaseUid: string;

  @Prop({ type: String, required: false })
  updatedByFirebaseUid: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const RubberOrderItemSchema = SchemaFactory.createForClass(RubberOrderItem);

RubberOrderItemSchema.virtual("order", {
  ref: "RubberOrder",
  localField: "orderId",
  foreignField: "_id",
  justOne: true,
});

RubberOrderItemSchema.virtual("product", {
  ref: "RubberProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
