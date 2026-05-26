import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FlangeTypeWeightDocument = HydratedDocument<FlangeTypeWeight>;

@Schema({
  collection: "flange_type_weights",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FlangeTypeWeight {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  flange_standard_id: number;

  @Prop({ type: String, required: true })
  pressure_class: string;

  @Prop({ type: String, required: true })
  flange_type_code: string;

  @Prop({ type: Number, required: true })
  nominal_bore_mm: number;

  @Prop({ type: Number, required: true })
  weight_kg: number;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: String, required: false })
  updated_at: string;

  @Prop({ type: Number, required: false })
  flangeStandardId: number;
}

export const FlangeTypeWeightSchema = SchemaFactory.createForClass(FlangeTypeWeight);

FlangeTypeWeightSchema.virtual("flangeStandard", {
  ref: "FlangeStandard",
  localField: "flangeStandardId",
  foreignField: "_id",
  justOne: true,
});
