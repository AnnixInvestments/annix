import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RfqDraftDocument = HydratedDocument<RfqDraft>;

@Schema({
  collection: "rfq_drafts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RfqDraft {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  draftNumber: string;

  @Prop({ type: String, required: false })
  customerRfqReference: string;

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
  straightPipeEntries: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  pendingDocuments: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  completionPercentage: number;

  @Prop({ type: Number, required: false })
  convertedRfqId: number;

  @Prop({ type: Boolean, default: false })
  isConverted: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  createdById: number;
}

export const RfqDraftSchema = SchemaFactory.createForClass(RfqDraft);

RfqDraftSchema.virtual("createdBy", {
  ref: "User",
  localField: "createdById",
  foreignField: "_id",
  justOne: true,
});

RfqDraftSchema.virtual("convertedRfq", {
  ref: "Rfq",
  localField: "convertedRfqId",
  foreignField: "_id",
  justOne: true,
});
