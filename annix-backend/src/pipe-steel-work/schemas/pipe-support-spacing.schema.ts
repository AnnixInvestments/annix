import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeSupportSpacingDocument = HydratedDocument<PipeSupportSpacing>;

@Schema({
  collection: "pipe_support_spacing",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeSupportSpacing {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nbMm: number;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: String, required: true })
  schedule: string;

  @Prop({ type: Number, required: true })
  waterFilledSpanM: number;

  @Prop({ type: Number, required: true })
  vaporGasSpanM: number;

  @Prop({ type: Number, required: false })
  rodSizeMm: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PipeSupportSpacingSchema = SchemaFactory.createForClass(PipeSupportSpacing);
