import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NbNpsLookupDocument = HydratedDocument<NbNpsLookup>;

@Schema({
  collection: "nb_nps_lookup",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NbNpsLookup {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nb_mm: number;

  @Prop({ type: Number, required: true })
  nps_inch: number;

  @Prop({ type: Number, required: true })
  outside_diameter_mm: number;
}

export const NbNpsLookupSchema = SchemaFactory.createForClass(NbNpsLookup);
