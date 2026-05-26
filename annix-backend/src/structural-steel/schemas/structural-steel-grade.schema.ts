import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StructuralSteelGradeDocument = HydratedDocument<StructuralSteelGrade>;

@Schema({
  collection: "structural_steel_grades",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StructuralSteelGrade {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  standard: string;

  @Prop({ type: Number, required: false })
  yieldStrengthMpa: number;

  @Prop({ type: Number, required: false })
  tensileStrengthMpa: number;

  @Prop({ type: Object, required: true })
  compatibleTypes: Record<string, unknown>;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const StructuralSteelGradeSchema = SchemaFactory.createForClass(StructuralSteelGrade);
