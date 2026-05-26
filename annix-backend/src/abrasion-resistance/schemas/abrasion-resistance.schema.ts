import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AbrasionResistanceDocument = HydratedDocument<AbrasionResistance>;

@Schema({
  collection: "abrasion_resistance",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AbrasionResistance {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  material: string;

  @Prop({ type: String, required: true })
  testCondition: string;

  @Prop({ type: Number, required: true })
  sandConcentrationPct: number;

  @Prop({ type: Number, required: false })
  velocityMS: number;

  @Prop({ type: Number, required: false })
  pressureMpa: number;

  @Prop({ type: String, required: false })
  temperatureC: string;

  @Prop({ type: Number, required: false })
  timeToRuptureHours: number;

  @Prop({ type: Number, required: false })
  wallThicknessMm: number;

  @Prop({ type: String, required: false })
  pipeSpecification: string;

  @Prop({ type: String, required: false })
  notes: string;
}

export const AbrasionResistanceSchema = SchemaFactory.createForClass(AbrasionResistance);
