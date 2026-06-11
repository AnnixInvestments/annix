import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NixUserPreferenceDocument = HydratedDocument<NixUserPreference>;

@Schema({
  collection: "nix_user_preferences",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NixUserPreference {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: true })
  preferenceKey: string;

  @Prop({ type: String, required: true })
  preferenceValue: string;

  @Prop({ type: Object, required: false })
  metadata: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  usageCount: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const NixUserPreferenceSchema = SchemaFactory.createForClass(NixUserPreference);

NixUserPreferenceSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
