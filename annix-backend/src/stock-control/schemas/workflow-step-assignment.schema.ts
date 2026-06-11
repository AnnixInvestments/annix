import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WorkflowStepAssignmentDocument = HydratedDocument<WorkflowStepAssignment>;

@Schema({
  collection: "workflow_step_assignments",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WorkflowStepAssignment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  workflowStep: string;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Boolean, required: true })
  isPrimary: boolean;

  @Prop({ type: String, required: false })
  secondaryUserId: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUserId: string;

  @Prop({ type: String, required: false })
  unifiedSecondaryUserId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const WorkflowStepAssignmentSchema = SchemaFactory.createForClass(WorkflowStepAssignment);

WorkflowStepAssignmentSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

WorkflowStepAssignmentSchema.virtual("user", {
  ref: "StockControlUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

WorkflowStepAssignmentSchema.virtual("secondaryUser", {
  ref: "StockControlUser",
  localField: "secondaryUserId",
  foreignField: "_id",
  justOne: true,
});

WorkflowStepAssignmentSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

WorkflowStepAssignmentSchema.virtual("unifiedUser", {
  ref: "User",
  localField: "unifiedUserId",
  foreignField: "_id",
  justOne: true,
});

WorkflowStepAssignmentSchema.virtual("unifiedSecondaryUser", {
  ref: "User",
  localField: "unifiedSecondaryUserId",
  foreignField: "_id",
  justOne: true,
});
