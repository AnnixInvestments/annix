import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FabricationComplexityDocument = HydratedDocument<FabricationComplexity>;

@Schema({
  collection: "fabrication_complexity_levels",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FabricationComplexity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  level: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  hoursPerTon: number;

  @Prop({ type: Number, required: true })
  laborMultiplier: number;

  @Prop({ type: Object, required: false })
  examples: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const FabricationComplexitySchema = SchemaFactory.createForClass(FabricationComplexity);
