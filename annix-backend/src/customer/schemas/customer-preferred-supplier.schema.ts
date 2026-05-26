import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerPreferredSupplierDocument = HydratedDocument<CustomerPreferredSupplier>;

@Schema({
  collection: "customer_preferred_suppliers",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerPreferredSupplier {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  customerCompanyId: number;

  @Prop({ type: String, required: false })
  supplierProfileId: string;

  @Prop({ type: String, required: false })
  supplierName: string;

  @Prop({ type: String, required: false })
  supplierEmail: string;

  @Prop({ type: Number, required: true })
  addedById: number;

  @Prop({ type: Number, required: true })
  priority: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const CustomerPreferredSupplierSchema =
  SchemaFactory.createForClass(CustomerPreferredSupplier);

CustomerPreferredSupplierSchema.virtual("customerCompany", {
  ref: "Company",
  localField: "customerCompanyId",
  foreignField: "_id",
  justOne: true,
});

CustomerPreferredSupplierSchema.virtual("supplierProfile", {
  ref: "SupplierProfile",
  localField: "supplierProfileId",
  foreignField: "_id",
  justOne: true,
});

CustomerPreferredSupplierSchema.virtual("addedBy", {
  ref: "CustomerProfile",
  localField: "addedById",
  foreignField: "_id",
  justOne: true,
});
