import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BracketTypeEntityDocument = HydratedDocument<BracketTypeEntity>;

@Schema({
  collection: "bracket_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BracketTypeEntity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  typeCode: string;

  @Prop({ type: String, required: true })
  displayName: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  minNbMm: number;

  @Prop({ type: Number, required: true })
  maxNbMm: number;

  @Prop({ type: Number, required: true })
  weightFactor: number;

  @Prop({ type: Number, required: false })
  baseCostPerUnit: number;

  @Prop({ type: Boolean, required: true })
  insulatedSuitable: boolean;

  @Prop({ type: Boolean, required: true })
  allowsExpansion: boolean;

  @Prop({ type: Boolean, required: true })
  isAnchorType: boolean;

  @Prop({ type: Number, required: false })
  dimensionAMm: number;

  @Prop({ type: Number, required: false })
  dimensionBMm: number;

  @Prop({ type: Number, required: false })
  rodDiameterMm: number;

  @Prop({ type: Number, required: false })
  widthMm: number;

  @Prop({ type: Number, required: false })
  thicknessMm: number;

  @Prop({ type: Number, required: false })
  lengthMm: number;

  @Prop({ type: Number, required: false })
  braceLengthMm: number;

  @Prop({ type: Number, required: false })
  baseWidthMm: number;

  @Prop({ type: Number, required: false })
  baseLengthMm: number;

  @Prop({ type: Number, required: false })
  heightMm: number;

  @Prop({ type: Number, required: false })
  weightKgPerUnit: number;

  @Prop({ type: Number, required: false })
  maxLoadKg: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const BracketTypeEntitySchema = SchemaFactory.createForClass(BracketTypeEntity);
