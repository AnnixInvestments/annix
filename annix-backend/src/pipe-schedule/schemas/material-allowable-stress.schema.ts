import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MaterialAllowableStressDocument = HydratedDocument<MaterialAllowableStress>;

@Schema({
  collection: "material_allowable_stresses",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MaterialAllowableStress {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  materialCode: string;

  @Prop({ type: String, required: true })
  materialName: string;

  @Prop({ type: Number, required: true })
  temperatureCelsius: number;

  @Prop({ type: Number, required: true })
  temperatureFahrenheit: number;

  @Prop({ type: Number, required: true })
  allowableStressKsi: number;

  @Prop({ type: Number, required: true })
  allowableStressMpa: number;

  @Prop({ type: String, required: true })
  sourceStandard: string;
}

export const MaterialAllowableStressSchema = SchemaFactory.createForClass(MaterialAllowableStress);
