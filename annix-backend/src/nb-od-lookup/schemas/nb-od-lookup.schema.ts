import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NbOdLookupDocument = HydratedDocument<NbOdLookup>;

@Schema({
  collection: "nb_od_lookup",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NbOdLookup {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  nominal_bore_mm: number;

  @Prop({ type: Number, required: true })
  outside_diameter_mm: number;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: String, required: false })
  updated_at: string;
}

export const NbOdLookupSchema = SchemaFactory.createForClass(NbOdLookup);
