import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StructuralSteelSectionDocument = HydratedDocument<StructuralSteelSection>;

@Schema({
  collection: "structural_steel_sections",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StructuralSteelSection {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  typeId: number;

  @Prop({ type: String, required: true })
  designation: string;

  @Prop({ type: Object, required: true })
  dimensions: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  weightKgPerM: number;

  @Prop({ type: Number, required: true })
  surfaceAreaM2PerM: number;

  @Prop({ type: Object, required: true })
  grades: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  sectionAreaMm2: number;

  @Prop({ type: Number, required: false })
  momentOfInertiaIxCm4: number;

  @Prop({ type: Number, required: false })
  momentOfInertiaIyCm4: number;

  @Prop({ type: Number, required: false })
  sectionModulusZxCm3: number;

  @Prop({ type: Number, required: false })
  sectionModulusZyCm3: number;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: Number, required: false })
  steelTypeId: number;
}

export const StructuralSteelSectionSchema = SchemaFactory.createForClass(StructuralSteelSection);

StructuralSteelSectionSchema.virtual("steelType", {
  ref: "StructuralSteelType",
  localField: "steelTypeId",
  foreignField: "_id",
  justOne: true,
});
