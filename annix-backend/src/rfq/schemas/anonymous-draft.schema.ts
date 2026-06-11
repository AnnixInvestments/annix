import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnonymousDraftDocument = HydratedDocument<AnonymousDraft>;

@Schema({
  collection: "anonymous_drafts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnonymousDraft {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  recoveryToken: string;

  @Prop({ type: String, required: false })
  customerEmail: string;

  @Prop({ type: String, required: false })
  projectName: string;

  @Prop({ type: Number, required: true })
  currentStep: number;

  @Prop({ type: Object, required: true })
  formData: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  globalSpecs: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  requiredProducts: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  entries: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  recoveryEmailSent: boolean;

  @Prop({ type: Date, required: false })
  recoveryEmailSentAt: Date;

  @Prop({ type: Boolean, required: true })
  isClaimed: boolean;

  @Prop({ type: String, required: false })
  browserFingerprint: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  claimedById: number;
}

export const AnonymousDraftSchema = SchemaFactory.createForClass(AnonymousDraft);

AnonymousDraftSchema.virtual("claimedBy", {
  ref: "User",
  localField: "claimedById",
  foreignField: "_id",
  justOne: true,
});
