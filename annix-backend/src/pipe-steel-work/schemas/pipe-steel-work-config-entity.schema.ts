import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeSteelWorkConfigEntityDocument = HydratedDocument<PipeSteelWorkConfigEntity>;

@Schema({
  collection: "pipe_steel_work_config",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeSteelWorkConfigEntity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  configKey: string;

  @Prop({ type: String, required: true })
  configValue: string;

  @Prop({ type: String, required: true })
  valueType: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: false })
  unit: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PipeSteelWorkConfigEntitySchema =
  SchemaFactory.createForClass(PipeSteelWorkConfigEntity);
