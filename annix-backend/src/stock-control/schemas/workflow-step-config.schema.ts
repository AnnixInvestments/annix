import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WorkflowStepConfigDocument = HydratedDocument<WorkflowStepConfig>;

@Schema({
  collection: "workflow_step_configs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WorkflowStepConfig {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: Boolean, required: true })
  isSystem: boolean;

  @Prop({ type: Boolean, required: true })
  isBackground: boolean;

  @Prop({ type: String, required: false })
  triggerAfterStep: string;

  @Prop({ type: String, required: false })
  actionLabel: string;

  @Prop({ type: String, required: false })
  branchColor: string;

  @Prop({ type: Object, required: false })
  phaseActionLabels: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  stepOutcomes: Record<string, unknown>;

  @Prop({ type: String, required: false })
  branchType: string;

  @Prop({ type: String, required: false })
  rejoinAtStep: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const WorkflowStepConfigSchema = SchemaFactory.createForClass(WorkflowStepConfig);

WorkflowStepConfigSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

WorkflowStepConfigSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
