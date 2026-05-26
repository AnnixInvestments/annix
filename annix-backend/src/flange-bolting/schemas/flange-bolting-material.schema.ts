import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlangeBoltingMaterialDocument = HydratedDocument<FlangeBoltingMaterial>;

@Schema({
  collection: "flange_bolting_materials",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlangeBoltingMaterial {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  materialGroup: string;

  @Prop({ type: String, required: true })
  studSpec: string;

  @Prop({ type: String, required: true })
  machineBoltSpec: string;

  @Prop({ type: String, required: true })
  nutSpec: string;

  @Prop({ type: String, required: true })
  washerSpec: string;
}

export const FlangeBoltingMaterialSchema = SchemaFactory.createForClass(FlangeBoltingMaterial);
