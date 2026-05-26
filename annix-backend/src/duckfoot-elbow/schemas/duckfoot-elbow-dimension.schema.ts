import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DuckfootElbowDimensionDocument = HydratedDocument<DuckfootElbowDimension>;

@Schema({
  collection: "duckfoot_elbow_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DuckfootElbowDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: Number, required: true })
  outsideDiameterMm: number;

  @Prop({ type: Number, required: true })
  basePlateXMm: number;

  @Prop({ type: Number, required: true })
  basePlateYMm: number;

  @Prop({ type: Number, required: true })
  ribThicknessT2Mm: number;

  @Prop({ type: Number, required: true })
  plateThicknessT1Mm: number;

  @Prop({ type: Number, required: true })
  ribHeightHMm: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const DuckfootElbowDimensionSchema = SchemaFactory.createForClass(DuckfootElbowDimension);
