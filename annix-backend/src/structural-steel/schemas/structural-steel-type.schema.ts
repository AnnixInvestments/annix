import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StructuralSteelTypeDocument = HydratedDocument<StructuralSteelType>;

@Schema({
  collection: "structural_steel_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StructuralSteelType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const StructuralSteelTypeSchema = SchemaFactory.createForClass(StructuralSteelType);

StructuralSteelTypeSchema.virtual("sections", {
  ref: "StructuralSteelSection",
  localField: "_id",
  foreignField: "steelTypeId",
  justOne: false,
});
