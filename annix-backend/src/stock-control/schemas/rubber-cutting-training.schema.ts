import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCuttingTrainingDocument = HydratedDocument<RubberCuttingTraining>;

@Schema({
  collection: "rubber_cutting_training",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCuttingTraining {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  panelFingerprint: string;

  @Prop({ type: Number, required: true })
  panelCount: number;

  @Prop({ type: Object, required: true })
  panelSummary: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  autoPlanSnapshot: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  manualPlan: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  autoWastePct: number;

  @Prop({ type: Number, required: true })
  manualWastePct: number;

  @Prop({ type: Number, required: true })
  rollWidthMm: number;

  @Prop({ type: Number, required: true })
  rollLengthMm: number;

  @Prop({ type: Number, required: true })
  usageCount: number;

  @Prop({ type: Number, required: true })
  timesSuggested: number;

  @Prop({ type: Number, required: true })
  timesApplied: number;

  @Prop({ type: Number, required: true })
  timesAppliedModified: number;

  @Prop({ type: Number, required: true })
  timesIgnored: number;

  @Prop({ type: Number, required: true })
  feedbackScore: number;

  @Prop({ type: String, required: false })
  reviewedBy: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  lastUsedAt: Date;
}

export const RubberCuttingTrainingSchema = SchemaFactory.createForClass(RubberCuttingTraining);

RubberCuttingTrainingSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

RubberCuttingTrainingSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
