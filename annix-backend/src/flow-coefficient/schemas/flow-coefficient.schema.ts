import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlowCoefficientDocument = HydratedDocument<FlowCoefficient>;

@Schema({
  collection: "flow_coefficients",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlowCoefficient {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  material: string;

  @Prop({ type: String, required: true })
  condition: string;

  @Prop({ type: Number, required: true })
  hazenWilliamsC: number;

  @Prop({ type: Number, required: false })
  manningN: number;

  @Prop({ type: Number, required: false })
  absoluteRoughnessMm: number;

  @Prop({ type: String, required: false })
  notes: string;
}

export const FlowCoefficientSchema = SchemaFactory.createForClass(FlowCoefficient);
