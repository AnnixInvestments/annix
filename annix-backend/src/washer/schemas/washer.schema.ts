import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WasherDocument = HydratedDocument<Washer>;

@Schema({
  collection: "washers",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Washer {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: false })
  material: string;

  @Prop({ type: Number, required: true })
  massKg: number;

  @Prop({ type: Number, required: false })
  odMm: number;

  @Prop({ type: Number, required: false })
  idMm: number;

  @Prop({ type: Number, required: false })
  thicknessMm: number;

  @Prop({ type: String, required: false })
  standard: string;

  @Prop({ type: Number, required: false })
  boltId: number;
}

export const WasherSchema = SchemaFactory.createForClass(Washer);

WasherSchema.virtual("bolt", {
  ref: "Bolt",
  localField: "boltId",
  foreignField: "_id",
  justOne: true,
});
