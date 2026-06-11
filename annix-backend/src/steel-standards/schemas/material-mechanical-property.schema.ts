import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MaterialMechanicalPropertyDocument = HydratedDocument<MaterialMechanicalProperty>;

@Schema({
  collection: "material_mechanical_properties",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MaterialMechanicalProperty {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  specificationCode: string;

  @Prop({ type: String, required: true })
  grade: string;

  @Prop({ type: String, required: false })
  unsNumber: string;

  @Prop({ type: String, required: false })
  pNumber: string;

  @Prop({ type: String, required: false })
  groupNumber: string;

  @Prop({ type: Number, required: false })
  smysMpa: number;

  @Prop({ type: Number, required: false })
  smtsMpa: number;

  @Prop({ type: Number, required: false })
  elongationPctMin: number;

  @Prop({ type: Number, required: false })
  carbonEquivalentMax: number;

  @Prop({ type: String, required: false })
  ceFormula: string;

  @Prop({ type: Number, required: false })
  impactTestTempC: number;

  @Prop({ type: Number, required: false })
  minImpactJ: number;

  @Prop({ type: Number, required: false })
  hardnessMaxHrc: number;

  @Prop({ type: Number, required: false })
  hardnessMaxHv: number;

  @Prop({ type: String, required: false })
  applicableStandards: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const MaterialMechanicalPropertySchema = SchemaFactory.createForClass(
  MaterialMechanicalProperty,
);
