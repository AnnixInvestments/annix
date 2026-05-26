import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HdpeFittingDimensionDocument = HydratedDocument<HdpeFittingDimension>;

@Schema({
  collection: "hdpe_fitting_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HdpeFittingDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  fittingType: string;

  @Prop({ type: Number, required: true })
  mainDnMm: number;

  @Prop({ type: Number, required: false })
  branchDnMm: number;

  @Prop({ type: Number, required: false })
  faceToFaceMm: number;

  @Prop({ type: Number, required: false })
  centreToFaceMm: number;

  @Prop({ type: Number, required: false })
  branchLengthMm: number;

  @Prop({ type: Number, required: false })
  lengthMm: number;

  @Prop({ type: String, required: true })
  source: string;

  @Prop({ type: String, required: true })
  sourceId: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const HdpeFittingDimensionSchema = SchemaFactory.createForClass(HdpeFittingDimension);
