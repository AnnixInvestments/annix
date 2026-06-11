import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerDeviceBindingDocument = HydratedDocument<CustomerDeviceBinding>;

@Schema({
  collection: "customer_device_bindings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerDeviceBinding {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  customerProfileId: number;

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

export const CustomerDeviceBindingSchema = SchemaFactory.createForClass(CustomerDeviceBinding);

CustomerDeviceBindingSchema.virtual("customerProfile", {
  ref: "CustomerProfile",
  localField: "customerProfileId",
  foreignField: "_id",
  justOne: true,
});
