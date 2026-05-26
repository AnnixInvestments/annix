import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerPurchaseOrderDocument = HydratedDocument<CustomerPurchaseOrder>;

@Schema({
  collection: "customer_purchase_orders",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerPurchaseOrder {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  cpoNumber: string;

  @Prop({ type: String, required: true })
  jobNumber: string;

  @Prop({ type: String, required: false })
  jobName: string;

  @Prop({ type: String, required: false })
  customerName: string;

  @Prop({ type: String, required: false })
  poNumber: string;

  @Prop({ type: String, required: false })
  siteLocation: string;

  @Prop({ type: String, required: false })
  contactPerson: string;

  @Prop({ type: String, required: false })
  dueDate: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  coatingSpecs: string;

  @Prop({ type: String, required: false })
  reference: string;

  @Prop({ type: Object, required: false })
  customFields: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: true })
  totalItems: number;

  @Prop({ type: Number, required: true })
  totalQuantity: number;

  @Prop({ type: Number, required: true })
  fulfilledQuantity: number;

  @Prop({ type: String, required: false })
  sourceFilePath: string;

  @Prop({ type: String, required: false })
  sourceFileName: string;

  @Prop({ type: Number, required: true })
  versionNumber: number;

  @Prop({ type: Object, required: true })
  previousVersions: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CustomerPurchaseOrderSchema = SchemaFactory.createForClass(CustomerPurchaseOrder);

CustomerPurchaseOrderSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

CustomerPurchaseOrderSchema.virtual("items", {
  ref: "CustomerPurchaseOrderItem",
  localField: "_id",
  foreignField: "cpoId",
  justOne: false,
});

CustomerPurchaseOrderSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
