import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeClampEntityDocument = HydratedDocument<PipeClampEntity>;

@Schema({
  collection: "pipe_clamps",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeClampEntity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  clampType: string;

  @Prop({ type: String, required: true })
  clampDescription: string;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: Number, required: true })
  nbMm: number;

  @Prop({ type: Number, required: true })
  pipeOdMinMm: number;

  @Prop({ type: Number, required: true })
  pipeOdMaxMm: number;

  @Prop({ type: String, required: true })
  boltSize: string;

  @Prop({ type: Number, required: true })
  boltCount: number;

  @Prop({ type: Number, required: true })
  boltLengthMm: number;

  @Prop({ type: Number, required: false })
  clampWidthMm: number;

  @Prop({ type: Number, required: false })
  clampThicknessMm: number;

  @Prop({ type: Number, required: true })
  unitWeightKg: number;

  @Prop({ type: Number, required: true })
  maxLoadKg: number;

  @Prop({ type: String, required: false })
  standard: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const PipeClampEntitySchema = SchemaFactory.createForClass(PipeClampEntity);
