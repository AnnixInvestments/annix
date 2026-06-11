import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WorkflowNotificationRecipientDocument = HydratedDocument<WorkflowNotificationRecipient>;

@Schema({
  collection: "workflow_notification_recipients",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WorkflowNotificationRecipient {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  workflowStep: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const WorkflowNotificationRecipientSchema = SchemaFactory.createForClass(
  WorkflowNotificationRecipient,
);

WorkflowNotificationRecipientSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

WorkflowNotificationRecipientSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
