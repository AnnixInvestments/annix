import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeEndPreparationDocument = HydratedDocument<PipeEndPreparation>;

@Schema({
  collection: "pipe_end_preparations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeEndPreparation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  prepType: string;

  @Prop({ type: String, required: true })
  displayName: string;

  @Prop({ type: Number, required: true })
  bevelAngleDeg: number;

  @Prop({ type: Number, required: true })
  bevelAngleTolDeg: number;

  @Prop({ type: Number, required: false })
  secondaryAngleDeg: number;

  @Prop({ type: Number, required: true })
  rootFaceMm: number;

  @Prop({ type: Number, required: true })
  rootFaceTolMm: number;

  @Prop({ type: Number, required: true })
  rootGapMmMin: number;

  @Prop({ type: Number, required: true })
  rootGapMmMax: number;

  @Prop({ type: Number, required: false })
  landMm: number;

  @Prop({ type: Number, required: true })
  wallThicknessMinMm: number;

  @Prop({ type: Number, required: true })
  wallThicknessMaxMm: number;

  @Prop({ type: String, required: false })
  applicableCodes: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const PipeEndPreparationSchema = SchemaFactory.createForClass(PipeEndPreparation);
