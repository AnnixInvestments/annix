import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlangeTypeDocument = HydratedDocument<FlangeType>;

@Schema({
  collection: "flange_types",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlangeType {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  abbreviation: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  standardReference: string;
}

export const FlangeTypeSchema = SchemaFactory.createForClass(FlangeType);
