import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WeldTypeDocument = HydratedDocument<WeldType>;

@Schema({
  collection: "weld_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WeldType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  weld_code: string;

  @Prop({ type: String, required: true })
  weld_name: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: String, required: false })
  updated_at: string;
}

export const WeldTypeSchema = SchemaFactory.createForClass(WeldType);
