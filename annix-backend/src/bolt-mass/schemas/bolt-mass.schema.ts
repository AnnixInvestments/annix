import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BoltMassDocument = HydratedDocument<BoltMass>;

@Schema({
  collection: "bolt_masses",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BoltMass {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  length_mm: number;

  @Prop({ type: Number, required: true })
  mass_kg: number;

  @Prop({ type: Number, required: false })
  boltId: number;
}

export const BoltMassSchema = SchemaFactory.createForClass(BoltMass);

BoltMassSchema.virtual("bolt", {
  ref: "Bolt",
  localField: "boltId",
  foreignField: "_id",
  justOne: true,
});
