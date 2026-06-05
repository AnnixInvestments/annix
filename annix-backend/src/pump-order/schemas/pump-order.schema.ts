import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PumpOrderDocument = HydratedDocument<PumpOrder>;

@Schema({
  collection: "pump_orders",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PumpOrder {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  orderNumber: string;

  @Prop({ type: String, required: false })
  customerReference: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: true })
  orderType: string;

  @Prop({ type: Number, required: false })
  rfqId: number;

  @Prop({ type: String, required: false })
  customerCompany: string;

  @Prop({ type: String, required: false })
  customerContact: string;

  @Prop({ type: String, required: false })
  customerEmail: string;

  @Prop({ type: String, required: false })
  customerPhone: string;

  @Prop({ type: String, required: false })
  deliveryAddress: string;

  @Prop({ type: Date, required: false })
  requestedDeliveryDate: Date;

  @Prop({ type: Date, required: false })
  confirmedDeliveryDate: Date;

  @Prop({ type: Number, required: false })
  supplierId: number;

  @Prop({ type: Number, required: true })
  subtotal: number;

  @Prop({ type: Number, required: true })
  vatAmount: number;

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: false })
  specialInstructions: string;

  @Prop({ type: String, required: false })
  internalNotes: string;

  @Prop({ type: Object, required: true })
  statusHistory: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: String, required: false })
  updatedBy: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PumpOrderSchema = SchemaFactory.createForClass(PumpOrder);

PumpOrderSchema.virtual("supplier", {
  ref: "SupplierProfile",
  localField: "supplierId",
  foreignField: "_id",
  justOne: true,
});

PumpOrderSchema.virtual("items", {
  ref: "PumpOrderItem",
  localField: "_id",
  foreignField: "orderId",
  justOne: false,
});
