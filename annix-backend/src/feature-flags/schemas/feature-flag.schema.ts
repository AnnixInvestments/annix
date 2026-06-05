import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type FeatureFlagDocument = HydratedDocument<FeatureFlag>;

@Schema({
  collection: "feature_flags",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class FeatureFlag {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  flagKey: string;

  @Prop({ type: Boolean, required: true })
  enabled: boolean;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);
