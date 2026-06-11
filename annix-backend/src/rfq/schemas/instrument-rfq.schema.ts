import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type InstrumentRfqDocument = HydratedDocument<InstrumentRfq>;

@Schema({
  collection: "instrument_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class InstrumentRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  instrumentType: string;

  @Prop({ type: String, required: true })
  instrumentCategory: string;

  @Prop({ type: String, required: false })
  size: string;

  @Prop({ type: String, required: true })
  processConnection: string;

  @Prop({ type: String, required: true })
  wettedMaterial: string;

  @Prop({ type: Number, required: false })
  rangeMin: number;

  @Prop({ type: Number, required: false })
  rangeMax: number;

  @Prop({ type: String, required: false })
  rangeUnit: string;

  @Prop({ type: String, required: true })
  outputSignal: string;

  @Prop({ type: String, required: false })
  communicationProtocol: string;

  @Prop({ type: String, required: true })
  displayType: string;

  @Prop({ type: String, required: true })
  powerSupply: string;

  @Prop({ type: String, required: true })
  cableEntry: string;

  @Prop({ type: String, required: true })
  explosionProof: string;

  @Prop({ type: String, required: true })
  ipRating: string;

  @Prop({ type: String, required: false })
  accuracyClass: string;

  @Prop({ type: String, required: true })
  calibration: string;

  @Prop({ type: String, required: true })
  processMedia: string;

  @Prop({ type: Number, required: false })
  operatingPressure: number;

  @Prop({ type: Number, required: false })
  operatingTemp: number;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: String, required: false })
  supplierReference: string;

  @Prop({ type: String, required: false })
  modelNumber: string;

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

export const InstrumentRfqSchema = SchemaFactory.createForClass(InstrumentRfq);

InstrumentRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
