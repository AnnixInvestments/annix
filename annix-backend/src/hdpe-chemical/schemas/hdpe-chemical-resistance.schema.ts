import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type HdpeChemicalResistanceDocument = HydratedDocument<HdpeChemicalResistance>;

@Schema({
  collection: "hdpe_chemical_resistance",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class HdpeChemicalResistance {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  substance: string;

  @Prop({ type: String, required: false })
  concentration: string;

  @Prop({ type: Number, required: true })
  temperatureC: number;

  @Prop({ type: String, required: true })
  hdpeRating: string;

  @Prop({ type: String, required: false })
  ppRating: string;

  @Prop({ type: Number, required: false })
  fcrFactor: number;

  @Prop({ type: Number, required: false })
  fcrtFactor: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const HdpeChemicalResistanceSchema = SchemaFactory.createForClass(HdpeChemicalResistance);
