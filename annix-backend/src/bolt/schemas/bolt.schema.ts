import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BoltDocument = HydratedDocument<Bolt>;

@Schema({
  collection: "bolts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Bolt {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  designation: string;

  @Prop({ type: String, required: false })
  grade: string;

  @Prop({ type: String, required: false })
  material: string;

  @Prop({ type: String, required: false })
  headStyle: string;

  @Prop({ type: String, required: false })
  threadType: string;

  @Prop({ type: Number, required: false })
  threadPitchMm: number;

  @Prop({ type: String, required: false })
  finish: string;

  @Prop({ type: String, required: false })
  standard: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: false })
  driveType: string;

  @Prop({ type: String, required: false })
  pointType: string;
}

export const BoltSchema = SchemaFactory.createForClass(Bolt);

BoltSchema.virtual("boltMasses", {
  ref: "BoltMass",
  localField: "_id",
  foreignField: "boltId",
  justOne: false,
});

BoltSchema.virtual("nutsMasses", {
  ref: "NutMass",
  localField: "_id",
  foreignField: "boltId",
  justOne: false,
});
