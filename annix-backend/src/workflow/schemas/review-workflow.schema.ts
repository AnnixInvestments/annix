import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ReviewWorkflowDocument = HydratedDocument<ReviewWorkflow>;

@Schema({
  collection: "review_workflows",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ReviewWorkflow {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  workflowType: string;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: Number, required: true })
  entityId: number;

  @Prop({ type: String, required: true })
  currentStatus: string;

  @Prop({ type: String, required: false })
  previousStatus: string;

  @Prop({ type: String, required: false })
  decisionNotes: string;

  @Prop({ type: Date, required: false })
  submittedAt: Date;

  @Prop({ type: Date, required: false })
  decidedAt: Date;

  @Prop({ type: Date, required: false })
  dueDate: Date;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  submittedById: number;

  @Prop({ type: Number, required: false })
  assignedReviewerId: number;

  @Prop({ type: Number, required: false })
  decidedById: number;
}

export const ReviewWorkflowSchema = SchemaFactory.createForClass(ReviewWorkflow);

ReviewWorkflowSchema.virtual("submittedBy", {
  ref: "User",
  localField: "submittedById",
  foreignField: "_id",
  justOne: true,
});

ReviewWorkflowSchema.virtual("assignedReviewer", {
  ref: "User",
  localField: "assignedReviewerId",
  foreignField: "_id",
  justOne: true,
});

ReviewWorkflowSchema.virtual("decidedBy", {
  ref: "User",
  localField: "decidedById",
  foreignField: "_id",
  justOne: true,
});
