import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NixLearningDocument = HydratedDocument<NixLearning>;

@Schema({
  collection: "nix_learning",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NixLearning {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  learningType: string;

  @Prop({ type: String, required: true })
  source: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: true })
  patternKey: string;

  @Prop({ type: String, required: false })
  originalValue: string;

  @Prop({ type: String, required: true })
  learnedValue: string;

  @Prop({ type: Object, required: false })
  context: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  confidence: number;

  @Prop({ type: Number, required: true })
  confirmationCount: number;

  @Prop({ type: [String], required: false })
  applicableProducts: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Boolean, required: false })
  quarantined: boolean;

  @Prop({ type: String, required: false })
  sourceIpHash: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const NixLearningSchema = SchemaFactory.createForClass(NixLearning);
