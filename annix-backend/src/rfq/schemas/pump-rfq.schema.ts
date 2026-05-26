import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PumpRfqDocument = HydratedDocument<PumpRfq>;

@Schema({
  collection: "pump_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PumpRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  serviceType: string;

  @Prop({ type: String, required: true })
  pumpType: string;

  @Prop({ type: String, required: false })
  pumpCategory: string;

  @Prop({ type: Number, required: false })
  flowRate: number;

  @Prop({ type: Number, required: false })
  totalHead: number;

  @Prop({ type: Number, required: false })
  suctionHead: number;

  @Prop({ type: Number, required: false })
  npshAvailable: number;

  @Prop({ type: Number, required: false })
  dischargePressure: number;

  @Prop({ type: Number, required: false })
  operatingTemp: number;

  @Prop({ type: String, required: true })
  fluidType: string;

  @Prop({ type: Number, required: false })
  specificGravity: number;

  @Prop({ type: Number, required: false })
  viscosity: number;

  @Prop({ type: Number, required: false })
  solidsContent: number;

  @Prop({ type: Number, required: false })
  solidsSize: number;

  @Prop({ type: Number, required: false })
  ph: number;

  @Prop({ type: Boolean, required: true })
  isAbrasive: boolean;

  @Prop({ type: Boolean, required: true })
  isCorrosive: boolean;

  @Prop({ type: String, required: true })
  casingMaterial: string;

  @Prop({ type: String, required: true })
  impellerMaterial: string;

  @Prop({ type: String, required: false })
  shaftMaterial: string;

  @Prop({ type: String, required: false })
  sealType: string;

  @Prop({ type: String, required: false })
  sealPlan: string;

  @Prop({ type: String, required: false })
  suctionSize: string;

  @Prop({ type: String, required: false })
  dischargeSize: string;

  @Prop({ type: String, required: false })
  connectionType: string;

  @Prop({ type: String, required: true })
  motorType: string;

  @Prop({ type: Number, required: false })
  motorPower: number;

  @Prop({ type: String, required: false })
  voltage: string;

  @Prop({ type: String, required: false })
  frequency: string;

  @Prop({ type: String, required: false })
  motorEfficiency: string;

  @Prop({ type: String, required: false })
  enclosure: string;

  @Prop({ type: String, required: true })
  hazardousArea: string;

  @Prop({ type: [String], required: true })
  certifications: string;

  @Prop({ type: String, required: false })
  sparePartCategory: string;

  @Prop({ type: Object, required: false })
  spareParts: Record<string, unknown>;

  @Prop({ type: String, required: false })
  existingPumpModel: string;

  @Prop({ type: String, required: false })
  existingPumpSerial: string;

  @Prop({ type: Number, required: false })
  rentalDurationDays: number;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: String, required: false })
  supplierReference: string;

  @Prop({ type: Number, required: false })
  unitCostFromSupplier: number;

  @Prop({ type: Number, required: true })
  markupPercentage: number;

  @Prop({ type: Number, required: false })
  unitCost: number;

  @Prop({ type: Number, required: false })
  totalCost: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Object, required: false })
  calculationData: Record<string, unknown>;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  rfqItemId: number;
}

export const PumpRfqSchema = SchemaFactory.createForClass(PumpRfq);

PumpRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
