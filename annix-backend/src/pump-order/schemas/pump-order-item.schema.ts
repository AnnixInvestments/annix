import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PumpOrderItemDocument = HydratedDocument<PumpOrderItem>;

@Schema({
  collection: "pump_order_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PumpOrderItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  orderId: number;

  @Prop({ type: Number, required: false })
  productId: number;

  @Prop({ type: String, required: true })
  itemType: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: false })
  pumpType: string;

  @Prop({ type: String, required: false })
  manufacturer: string;

  @Prop({ type: String, required: false })
  modelNumber: string;

  @Prop({ type: String, required: false })
  partNumber: string;

  @Prop({ type: Number, required: false })
  flowRate: number;

  @Prop({ type: Number, required: false })
  head: number;

  @Prop({ type: Number, required: false })
  motorPowerKw: number;

  @Prop({ type: String, required: false })
  casingMaterial: string;

  @Prop({ type: String, required: false })
  impellerMaterial: string;

  @Prop({ type: String, required: false })
  sealType: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  unitPrice: number;

  @Prop({ type: Number, required: true })
  discountPercent: number;

  @Prop({ type: Number, required: true })
  lineTotal: number;

  @Prop({ type: Number, required: false })
  leadTimeDays: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Object, required: false })
  specifications: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PumpOrderItemSchema = SchemaFactory.createForClass(PumpOrderItem);

PumpOrderItemSchema.virtual("order", {
  ref: "PumpOrder",
  localField: "orderId",
  foreignField: "_id",
  justOne: true,
});

PumpOrderItemSchema.virtual("product", {
  ref: "PumpProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});
