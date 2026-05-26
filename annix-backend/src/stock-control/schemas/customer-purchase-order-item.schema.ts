import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerPurchaseOrderItemDocument = HydratedDocument<CustomerPurchaseOrderItem>;

@Schema({
  collection: "customer_purchase_order_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerPurchaseOrderItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  cpoId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  itemCode: string;

  @Prop({ type: String, required: false })
  itemDescription: string;

  @Prop({ type: String, required: false })
  itemNo: string;

  @Prop({ type: Number, required: true })
  quantityOrdered: number;

  @Prop({ type: Number, required: true })
  quantityFulfilled: number;

  @Prop({ type: String, required: false })
  jtNo: string;

  @Prop({ type: Number, required: false })
  m2: number;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const CustomerPurchaseOrderItemSchema =
  SchemaFactory.createForClass(CustomerPurchaseOrderItem);

CustomerPurchaseOrderItemSchema.virtual("cpo", {
  ref: "CustomerPurchaseOrder",
  localField: "cpoId",
  foreignField: "_id",
  justOne: true,
});

CustomerPurchaseOrderItemSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

CustomerPurchaseOrderItemSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
