import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MaterialLimitDocument = HydratedDocument<MaterialLimit>;

@Schema({
  collection: "material_limits",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MaterialLimit {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  steel_specification_id: number;

  @Prop({ type: String, required: true })
  specification_pattern: string;

  @Prop({ type: String, required: true })
  material_type: string;

  @Prop({ type: Number, required: true })
  min_temp_c: number;

  @Prop({ type: Number, required: true })
  max_temp_c: number;

  @Prop({ type: Number, required: true })
  max_pressure_bar: number;

  @Prop({ type: String, required: false })
  asme_p_number: string;

  @Prop({ type: String, required: false })
  asme_group_number: string;

  @Prop({ type: String, required: false })
  default_grade: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Boolean, required: true })
  is_seamless: boolean;

  @Prop({ type: Boolean, required: true })
  is_welded: boolean;

  @Prop({ type: String, required: false })
  standard_code: string;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: Number, required: false })
  steelSpecificationId: number;
}

export const MaterialLimitSchema = SchemaFactory.createForClass(MaterialLimit);

MaterialLimitSchema.virtual("steelSpecification", {
  ref: "SteelSpecification",
  localField: "steelSpecificationId",
  foreignField: "_id",
  justOne: true,
});
