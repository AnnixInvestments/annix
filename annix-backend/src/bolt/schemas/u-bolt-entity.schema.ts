import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type UBoltEntityDocument = HydratedDocument<UBoltEntity>;

@Schema({
  collection: "u_bolts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UBoltEntity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  nps: string;

  @Prop({ type: Number, required: true })
  nbMm: number;

  @Prop({ type: Number, required: true })
  pipeOdMinMm: number;

  @Prop({ type: Number, required: true })
  pipeOdMaxMm: number;

  @Prop({ type: String, required: true })
  threadSize: string;

  @Prop({ type: Number, required: true })
  threadDiameterMm: number;

  @Prop({ type: Number, required: true })
  insideWidthMm: number;

  @Prop({ type: Number, required: true })
  legLengthMm: number;

  @Prop({ type: Number, required: true })
  threadLengthMm: number;

  @Prop({ type: Number, required: true })
  rodDiameterMm: number;

  @Prop({ type: Number, required: true })
  unitWeightKg: number;

  @Prop({ type: String, required: false })
  standard: string;

  @Prop({ type: String, required: false })
  materialGrade: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const UBoltEntitySchema = SchemaFactory.createForClass(UBoltEntity);
