import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NixClarificationDocument = HydratedDocument<NixClarification>;

@Schema({
  collection: "nix_clarifications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NixClarification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  extractionId: number;

  @Prop({ type: Number, required: false })
  userId: number;

  @Prop({ type: String, required: true })
  clarificationType: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: Object, required: false })
  context: Record<string, unknown>;

  @Prop({ type: String, required: false })
  responseType: string;

  @Prop({ type: String, required: false })
  responseText: string;

  @Prop({ type: String, required: false })
  responseScreenshotPath: string;

  @Prop({ type: Object, required: false })
  responseDocumentRef: Record<string, unknown>;

  @Prop({ type: Boolean, default: false })
  usedForLearning: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Date, required: false })
  answeredAt: Date;
}

export const NixClarificationSchema = SchemaFactory.createForClass(NixClarification);

NixClarificationSchema.virtual("extraction", {
  ref: "NixExtraction",
  localField: "extractionId",
  foreignField: "_id",
  justOne: true,
});

NixClarificationSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
