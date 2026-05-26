import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type Sabs719BendDimensionDocument = HydratedDocument<Sabs719BendDimension>;

@Schema({
  collection: "sabs_719_bend_dimensions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Sabs719BendDimension {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  bendRadiusType: string;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: Number, required: true })
  outsideDiameterMm: number;

  @Prop({ type: Number, required: true })
  centerToFaceAMm: number;

  @Prop({ type: Number, required: true })
  centerToFaceBMm: number;

  @Prop({ type: Number, required: true })
  centerToFaceCMm: number;

  @Prop({ type: Number, required: true })
  radiusMm: number;
}

export const Sabs719BendDimensionSchema = SchemaFactory.createForClass(Sabs719BendDimension);
