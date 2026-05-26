import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerBlockedSupplierDocument = HydratedDocument<CustomerBlockedSupplier>;

@Schema({
  collection: "customer_blocked_suppliers",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerBlockedSupplier {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  customerCompanyId: number;

  @Prop({ type: Number, required: true })
  supplierProfileId: number;

  @Prop({ type: Number, required: true })
  blockedById: number;

  @Prop({ type: String, required: false })
  reason: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CustomerBlockedSupplierSchema = SchemaFactory.createForClass(CustomerBlockedSupplier);

CustomerBlockedSupplierSchema.virtual("customerCompany", {
  ref: "Company",
  localField: "customerCompanyId",
  foreignField: "_id",
  justOne: true,
});

CustomerBlockedSupplierSchema.virtual("supplierProfile", {
  ref: "SupplierProfile",
  localField: "supplierProfileId",
  foreignField: "_id",
  justOne: true,
});

CustomerBlockedSupplierSchema.virtual("blockedBy", {
  ref: "CustomerProfile",
  localField: "blockedById",
  foreignField: "_id",
  justOne: true,
});
