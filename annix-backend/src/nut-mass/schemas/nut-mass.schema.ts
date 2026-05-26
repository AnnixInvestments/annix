import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NutMassDocument = HydratedDocument<NutMass>;

@Schema({
  collection: "nut_masses",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NutMass {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  mass_kg: number;

  @Prop({ type: String, required: false })
  grade: string;

  @Prop({ type: String, required: false })
  type: string;

  @Prop({ type: String, required: false })
  standard: string;

  @Prop({ type: Number, required: false })
  boltId: number;
}

export const NutMassSchema = SchemaFactory.createForClass(NutMass);

NutMassSchema.virtual("bolt", {
  ref: "Bolt",
  localField: "boltId",
  foreignField: "_id",
  justOne: true,
});
