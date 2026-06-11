import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierDeviceBindingDocument = HydratedDocument<SupplierDeviceBinding>;

@Schema({
  collection: "supplier_device_bindings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierDeviceBinding {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  supplierProfileId: number;

  @Prop({ type: String, required: true })
  deviceFingerprint: string;

  @Prop({ type: Boolean, required: true })
  isPrimary: boolean;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Object, required: false })
  browserInfo: Record<string, unknown>;

  @Prop({ type: String, required: true })
  registeredIp: string;

  @Prop({ type: String, required: false })
  ipCountry: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Date, required: false })
  deactivatedAt: Date;

  @Prop({ type: Number, required: false })
  deactivatedBy: number;

  @Prop({ type: String, required: false })
  deactivationReason: string;
}

export const SupplierDeviceBindingSchema = SchemaFactory.createForClass(SupplierDeviceBinding);

SupplierDeviceBindingSchema.virtual("supplierProfile", {
  ref: "SupplierProfile",
  localField: "supplierProfileId",
  foreignField: "_id",
  justOne: true,
});
