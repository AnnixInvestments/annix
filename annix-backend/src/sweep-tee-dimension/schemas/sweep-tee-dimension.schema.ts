import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SweepTeeDimensionDocument = HydratedDocument<SweepTeeDimension>;

@Schema({
  collection: "sweep_tee_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SweepTeeDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: Number, required: true })
  outsideDiameterMm: number;

  @Prop({ type: String, required: true })
  radiusType: string;

  @Prop({ type: Number, required: true })
  bendRadiusMm: number;

  @Prop({ type: Number, required: true })
  pipeALengthMm: number;

  @Prop({ type: Number, required: false })
  elbowEMm: number;

  @Prop({ type: Date, required: true })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  updatedAt: Date;
}

export const SweepTeeDimensionSchema = SchemaFactory.createForClass(SweepTeeDimension);
