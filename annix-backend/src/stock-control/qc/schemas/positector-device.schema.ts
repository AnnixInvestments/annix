import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PositectorDeviceDocument = HydratedDocument<PositectorDevice>;

@Schema({
  collection: "positector_devices",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PositectorDevice {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  deviceName: string;

  @Prop({ type: String, required: true })
  ipAddress: string;

  @Prop({ type: Number, required: true })
  port: number;

  @Prop({ type: String, required: false })
  probeType: string;

  @Prop({ type: String, required: false })
  serialNumber: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  lastConnectedAt: Date;

  @Prop({ type: String, required: true })
  registeredByName: string;

  @Prop({ type: Number, required: false })
  registeredById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PositectorDeviceSchema = SchemaFactory.createForClass(PositectorDevice);

PositectorDeviceSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

PositectorDeviceSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
