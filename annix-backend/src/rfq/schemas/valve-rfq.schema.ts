import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ValveRfqDocument = HydratedDocument<ValveRfq>;

@Schema({
  collection: "valve_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ValveRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  valveType: string;

  @Prop({ type: String, required: false })
  valveCategory: string;

  @Prop({ type: String, required: true })
  size: string;

  @Prop({ type: String, required: true })
  pressureClass: string;

  @Prop({ type: String, required: true })
  connectionType: string;

  @Prop({ type: String, required: true })
  bodyMaterial: string;

  @Prop({ type: String, required: false })
  trimMaterial: string;

  @Prop({ type: String, required: true })
  seatMaterial: string;

  @Prop({ type: String, required: false })
  portType: string;

  @Prop({ type: String, required: true })
  actuatorType: string;

  @Prop({ type: Number, required: false })
  airSupply: number;

  @Prop({ type: String, required: false })
  voltage: string;

  @Prop({ type: String, required: false })
  failPosition: string;

  @Prop({ type: String, required: false })
  positioner: string;

  @Prop({ type: Boolean, required: true })
  limitSwitches: boolean;

  @Prop({ type: Boolean, required: true })
  solenoidValve: boolean;

  @Prop({ type: String, required: true })
  media: string;

  @Prop({ type: Number, required: false })
  operatingPressure: number;

  @Prop({ type: Number, required: false })
  operatingTemp: number;

  @Prop({ type: String, required: true })
  hazardousArea: string;

  @Prop({ type: Number, required: false })
  cv: number;

  @Prop({ type: Number, required: false })
  flowRate: number;

  @Prop({ type: String, required: false })
  seatLeakageClass: string;

  @Prop({ type: String, required: false })
  fireSafeStandard: string;

  @Prop({ type: String, required: true })
  cryogenicService: string;

  @Prop({ type: String, required: true })
  fugitiveEmissions: string;

  @Prop({ type: String, required: true })
  extendedBonnet: string;

  @Prop({ type: [String], required: true })
  certifications: string;

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

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  rfqItemId: number;
}

export const ValveRfqSchema = SchemaFactory.createForClass(ValveRfq);

ValveRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
