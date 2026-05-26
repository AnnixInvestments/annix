import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeToleranceDocument = HydratedDocument<PipeTolerance>;

@Schema({
  collection: "pipe_tolerances",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeTolerance {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  standard: string;

  @Prop({ type: Number, required: true })
  npsMinMm: number;

  @Prop({ type: Number, required: true })
  npsMaxMm: number;

  @Prop({ type: Number, required: true })
  odTolerancePct: number;

  @Prop({ type: Number, required: false })
  odToleranceMmMax: number;

  @Prop({ type: Number, required: true })
  wallTolerancePctUnder: number;

  @Prop({ type: Number, required: false })
  wallTolerancePctOver: number;

  @Prop({ type: Number, required: true })
  lengthSrlPlusMm: number;

  @Prop({ type: Number, required: true })
  lengthSrlMinusMm: number;

  @Prop({ type: Number, required: true })
  lengthDrlPlusMm: number;

  @Prop({ type: Number, required: true })
  lengthDrlMinusMm: number;

  @Prop({ type: Number, required: true })
  straightnessRatio: number;

  @Prop({ type: Number, required: true })
  weightTolerancePct: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const PipeToleranceSchema = SchemaFactory.createForClass(PipeTolerance);
