import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PumpProductDocument = HydratedDocument<PumpProduct>;

@Schema({
  collection: "pump_products",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PumpProduct {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  sku: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: true })
  pumpType: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: true })
  manufacturer: string;

  @Prop({ type: String, required: false })
  modelNumber: string;

  @Prop({ type: String, required: false })
  api610Type: string;

  @Prop({ type: Number, required: false })
  flowRateMin: number;

  @Prop({ type: Number, required: false })
  flowRateMax: number;

  @Prop({ type: Number, required: false })
  headMin: number;

  @Prop({ type: Number, required: false })
  headMax: number;

  @Prop({ type: Number, required: false })
  maxTemperature: number;

  @Prop({ type: Number, required: false })
  maxPressure: number;

  @Prop({ type: String, required: false })
  suctionSize: string;

  @Prop({ type: String, required: false })
  dischargeSize: string;

  @Prop({ type: String, required: false })
  casingMaterial: string;

  @Prop({ type: String, required: false })
  impellerMaterial: string;

  @Prop({ type: String, required: false })
  shaftMaterial: string;

  @Prop({ type: String, required: false })
  sealType: string;

  @Prop({ type: Number, required: false })
  motorPowerKw: number;

  @Prop({ type: String, required: false })
  voltage: string;

  @Prop({ type: String, required: false })
  frequency: string;

  @Prop({ type: Number, required: false })
  weightKg: number;

  @Prop({ type: [String], required: true })
  certifications: string;

  @Prop({ type: [String], required: true })
  applications: string;

  @Prop({ type: Number, required: false })
  baseCost: number;

  @Prop({ type: Number, required: false })
  listPrice: number;

  @Prop({ type: Number, required: true })
  markupPercentage: number;

  @Prop({ type: Number, required: false })
  leadTimeDays: number;

  @Prop({ type: Number, required: true })
  stockQuantity: number;

  @Prop({ type: String, required: false })
  datasheetUrl: string;

  @Prop({ type: String, required: false })
  imageUrl: string;

  @Prop({ type: Object, required: false })
  specifications: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  pumpCurveData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Number, required: false })
  supplierId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PumpProductSchema = SchemaFactory.createForClass(PumpProduct);

PumpProductSchema.virtual("supplier", {
  ref: "SupplierProfile",
  localField: "supplierId",
  foreignField: "_id",
  justOne: true,
});
