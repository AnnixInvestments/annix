import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type BendSegmentRuleDocument = HydratedDocument<BendSegmentRule>;

@Schema({
  collection: "bend_segment_rules",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class BendSegmentRule {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  bendRadiusType: string;

  @Prop({ type: Number, required: true })
  angleRangeMin: number;

  @Prop({ type: Number, required: true })
  angleRangeMax: number;

  @Prop({ type: Number, required: true })
  minSegments: number;

  @Prop({ type: Number, required: true })
  maxSegments: number;

  @Prop({ type: String, required: true })
  dimensionColumn: string;

  @Prop({ type: String, required: false })
  description: string;
}

export const BendSegmentRuleSchema = SchemaFactory.createForClass(BendSegmentRule);
