import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FabricationOperationDocument = HydratedDocument<FabricationOperation>;

@Schema({
  collection: "fabrication_operations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FabricationOperation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: Number, required: true })
  hoursPerUnit: number;

  @Prop({ type: Number, required: false })
  costPerUnit: number;

  @Prop({ type: Number, required: true })
  stainlessMultiplier: number;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const FabricationOperationSchema = SchemaFactory.createForClass(FabricationOperation);
