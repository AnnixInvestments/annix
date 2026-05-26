import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WeldDefectAcceptanceDocument = HydratedDocument<WeldDefectAcceptance>;

@Schema({
  collection: "weld_defect_acceptance",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WeldDefectAcceptance {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  codeDisplayName: string;

  @Prop({ type: String, required: true })
  defectType: string;

  @Prop({ type: String, required: true })
  defectDisplayName: string;

  @Prop({ type: Number, required: false })
  maxDimensionMm: number;

  @Prop({ type: Number, required: false })
  maxDimensionPctT: number;

  @Prop({ type: String, required: false })
  spacingRequirement: string;

  @Prop({ type: String, required: false })
  cumulativeLimit: string;

  @Prop({ type: Number, required: false })
  repairLimit: number;

  @Prop({ type: Boolean, required: true })
  permitted: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const WeldDefectAcceptanceSchema = SchemaFactory.createForClass(WeldDefectAcceptance);
