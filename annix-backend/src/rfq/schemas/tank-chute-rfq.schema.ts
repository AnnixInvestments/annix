import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type TankChuteRfqDocument = HydratedDocument<TankChuteRfq>;

@Schema({
  collection: "tank_chute_rfqs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TankChuteRfq {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  assemblyType: string;

  @Prop({ type: String, required: false })
  drawingReference: string;

  @Prop({ type: String, required: false })
  materialGrade: string;

  @Prop({ type: Number, required: false })
  overallLengthMm: number;

  @Prop({ type: Number, required: false })
  overallWidthMm: number;

  @Prop({ type: Number, required: false })
  overallHeightMm: number;

  @Prop({ type: Number, required: false })
  totalSteelWeightKg: number;

  @Prop({ type: String, required: false })
  weightSource: string;

  @Prop({ type: Number, required: true })
  quantityValue: number;

  @Prop({ type: Boolean, required: true })
  liningRequired: boolean;

  @Prop({ type: String, required: false })
  liningType: string;

  @Prop({ type: Number, required: false })
  liningThicknessMm: number;

  @Prop({ type: Number, required: false })
  liningAreaM2: number;

  @Prop({ type: Number, required: false })
  liningWastagePercent: number;

  @Prop({ type: String, required: false })
  rubberGrade: string;

  @Prop({ type: Number, required: false })
  rubberHardnessShore: number;

  @Prop({ type: Boolean, required: true })
  coatingRequired: boolean;

  @Prop({ type: String, required: false })
  coatingSystem: string;

  @Prop({ type: Number, required: false })
  coatingAreaM2: number;

  @Prop({ type: Number, required: false })
  coatingWastagePercent: number;

  @Prop({ type: String, required: false })
  surfacePrepStandard: string;

  @Prop({ type: Object, required: false })
  plateBom: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  bomTotalWeightKg: number;

  @Prop({ type: Number, required: false })
  bomTotalAreaM2: number;

  @Prop({ type: Number, required: false })
  steelPricePerKg: number;

  @Prop({ type: Number, required: false })
  liningPricePerM2: number;

  @Prop({ type: Number, required: false })
  coatingPricePerM2: number;

  @Prop({ type: Number, required: false })
  fabricationCost: number;

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

export const TankChuteRfqSchema = SchemaFactory.createForClass(TankChuteRfq);

TankChuteRfqSchema.virtual("rfqItem", {
  ref: "RfqItem",
  localField: "rfqItemId",
  foreignField: "_id",
  justOne: true,
});
