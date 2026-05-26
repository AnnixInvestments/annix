import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type Sabs719TestPressureDocument = HydratedDocument<Sabs719TestPressure>;

@Schema({
  collection: "sabs_719_test_pressures",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Sabs719TestPressure {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  grade: string;

  @Prop({ type: Number, required: true })
  nominalBoreMm: number;

  @Prop({ type: Number, required: true })
  outsideDiameterMm: number;

  @Prop({ type: Number, required: true })
  wallThicknessMm: number;

  @Prop({ type: Number, required: true })
  testPressureKpa: number;

  @Prop({ type: Number, required: true })
  yieldStressMpa: number;
}

export const Sabs719TestPressureSchema = SchemaFactory.createForClass(Sabs719TestPressure);
