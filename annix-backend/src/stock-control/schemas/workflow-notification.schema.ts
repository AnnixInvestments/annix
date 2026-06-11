import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WorkflowNotificationDocument = HydratedDocument<WorkflowNotification>;

@Schema({
  collection: "workflow_notifications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WorkflowNotification {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: false })
  jobCardId: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  message: string;

  @Prop({ type: String, required: true })
  actionType: string;

  @Prop({ type: String, required: false })
  actionUrl: string;

  @Prop({ type: Date, required: false })
  readAt: Date;

  @Prop({ type: String, required: false })
  senderId: string;

  @Prop({ type: String, required: false })
  senderName: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUserId: string;

  @Prop({ type: String, required: false })
  unifiedSenderId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const WorkflowNotificationSchema = SchemaFactory.createForClass(WorkflowNotification);

WorkflowNotificationSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

WorkflowNotificationSchema.virtual("user", {
  ref: "StockControlUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

WorkflowNotificationSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

WorkflowNotificationSchema.virtual("sender", {
  ref: "StockControlUser",
  localField: "senderId",
  foreignField: "_id",
  justOne: true,
});

WorkflowNotificationSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

WorkflowNotificationSchema.virtual("unifiedUser", {
  ref: "User",
  localField: "unifiedUserId",
  foreignField: "_id",
  justOne: true,
});

WorkflowNotificationSchema.virtual("unifiedSender", {
  ref: "User",
  localField: "unifiedSenderId",
  foreignField: "_id",
  justOne: true,
});
