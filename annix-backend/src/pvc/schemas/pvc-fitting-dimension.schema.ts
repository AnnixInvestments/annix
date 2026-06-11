import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PvcFittingDimensionDocument = HydratedDocument<PvcFittingDimension>;

@Schema({
  collection: "pvc_fitting_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PvcFittingDimension {
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

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PvcFittingDimensionSchema = SchemaFactory.createForClass(PvcFittingDimension);
