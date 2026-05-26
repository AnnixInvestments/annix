import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BracketDimensionBySizeEntityDocument = HydratedDocument<BracketDimensionBySizeEntity>;

@Schema({
  collection: "bracket_dimensions_by_size",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BracketDimensionBySizeEntity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  bracketTypeCode: string;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: Number, required: true })
  nbMm: number;

  @Prop({ type: Number, required: false })
  dimensionAMm: number;

  @Prop({ type: Number, required: false })
  dimensionBMm: number;

  @Prop({ type: Number, required: false })
  rodDiameterMm: number;

  @Prop({ type: Number, required: true })
  unitWeightKg: number;

  @Prop({ type: Number, required: true })
  maxLoadKg: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: Number, required: false })
  bracketTypeId: number;
}

export const BracketDimensionBySizeEntitySchema = SchemaFactory.createForClass(
  BracketDimensionBySizeEntity,
);

BracketDimensionBySizeEntitySchema.virtual("bracketType", {
  ref: "BracketTypeEntity",
  localField: "bracketTypeId",
  foreignField: "_id",
  justOne: true,
});
