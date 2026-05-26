import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type LiningCoatingRuleDocument = HydratedDocument<LiningCoatingRule>;

@Schema({
  collection: "lining_coating_rules",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class LiningCoatingRule {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  abrasionLevel: string;

  @Prop({ type: String, required: true })
  corrosionLevel: string;

  @Prop({ type: String, required: true })
  recommendedLining: string;

  @Prop({ type: String, required: false })
  recommendedCoating: string;

  @Prop({ type: String, required: false })
  applicationNotes: string;

  @Prop({ type: Number, required: true })
  priority: number;
}

export const LiningCoatingRuleSchema = SchemaFactory.createForClass(LiningCoatingRule);
