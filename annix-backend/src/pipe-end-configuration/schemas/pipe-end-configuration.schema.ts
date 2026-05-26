import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PipeEndConfigurationDocument = HydratedDocument<PipeEndConfiguration>;

@Schema({
  collection: "pipe_end_configurations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PipeEndConfiguration {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  config_code: string;

  @Prop({ type: String, required: true })
  config_name: string;

  @Prop({ type: Number, required: true })
  weld_count: number;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Boolean, required: true })
  applies_to_pipe: boolean;

  @Prop({ type: Boolean, required: true })
  applies_to_bend: boolean;

  @Prop({ type: Boolean, required: true })
  applies_to_fitting: boolean;

  @Prop({ type: Boolean, required: true })
  has_tack_welds: boolean;

  @Prop({ type: Number, required: true })
  tack_weld_count_per_flange: number;

  @Prop({ type: Number, required: true })
  tack_weld_length_mm: number;

  @Prop({ type: Boolean, required: true })
  has_fixed_flange_end1: boolean;

  @Prop({ type: Boolean, required: true })
  has_fixed_flange_end2: boolean;

  @Prop({ type: Boolean, required: true })
  has_fixed_flange_end3: boolean;

  @Prop({ type: Boolean, required: true })
  has_loose_flange_end1: boolean;

  @Prop({ type: Boolean, required: true })
  has_loose_flange_end2: boolean;

  @Prop({ type: Boolean, required: true })
  has_loose_flange_end3: boolean;

  @Prop({ type: Boolean, required: true })
  has_rotating_flange_end1: boolean;

  @Prop({ type: Boolean, required: true })
  has_rotating_flange_end2: boolean;

  @Prop({ type: Boolean, required: true })
  has_rotating_flange_end3: boolean;

  @Prop({ type: Number, required: true })
  total_flanges: number;

  @Prop({ type: Number, required: true })
  bolt_sets_per_config: number;

  @Prop({ type: String, required: false })
  stub_flange_code: string;

  @Prop({ type: String, required: false })
  created_at: string;

  @Prop({ type: String, required: false })
  updated_at: string;

  @Prop({ type: Number, required: false })
  weldTypeId: number;
}

export const PipeEndConfigurationSchema = SchemaFactory.createForClass(PipeEndConfiguration);

PipeEndConfigurationSchema.virtual("weldType", {
  ref: "WeldType",
  localField: "weldTypeId",
  foreignField: "_id",
  justOne: true,
});
