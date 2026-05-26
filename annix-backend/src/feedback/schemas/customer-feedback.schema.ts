import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerFeedbackDocument = HydratedDocument<CustomerFeedback>;

@Schema({
  collection: "customer_feedback",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerFeedback {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  customerProfileId: string;

  @Prop({ type: String, required: false })
  conversationId: string;

  @Prop({ type: String, required: false })
  assignedToId: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: true })
  source: string;

  @Prop({ type: String, required: false })
  pageUrl: string;

  @Prop({ type: String, required: false })
  submitterType: string;

  @Prop({ type: String, required: false })
  submitterName: string;

  @Prop({ type: String, required: false })
  submitterEmail: string;

  @Prop({ type: String, required: false })
  appContext: string;

  @Prop({ type: Number, required: false })
  githubIssueNumber: number;

  @Prop({ type: String, required: false })
  aiClassification: string;

  @Prop({ type: Number, required: false })
  translatorConfidence: number;

  @Prop({ type: String, required: false })
  translatorLikelyLocation: string;

  @Prop({ type: String, required: false })
  translatorLikelyCause: string;

  @Prop({ type: String, required: false })
  translatorAffectedSurface: string;

  @Prop({ type: String, required: false })
  translatorFixScope: string;

  @Prop({ type: Boolean, required: false })
  translatorAutoFixable: boolean;

  @Prop({ type: Object, required: false })
  translatorRiskFlags: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  translatorReproductionSteps: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  captureCompletenessScore: number;

  @Prop({ type: Object, required: false })
  captureContext: Record<string, unknown>;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  resolutionStatus: string;

  @Prop({ type: String, required: false })
  testCriteria: string;

  @Prop({ type: Date, required: false })
  verifiedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const CustomerFeedbackSchema = SchemaFactory.createForClass(CustomerFeedback);

CustomerFeedbackSchema.virtual("customerProfile", {
  ref: "CustomerProfile",
  localField: "customerProfileId",
  foreignField: "_id",
  justOne: true,
});

CustomerFeedbackSchema.virtual("conversation", {
  ref: "Conversation",
  localField: "conversationId",
  foreignField: "_id",
  justOne: true,
});

CustomerFeedbackSchema.virtual("assignedTo", {
  ref: "User",
  localField: "assignedToId",
  foreignField: "_id",
  justOne: true,
});

CustomerFeedbackSchema.virtual("attachments", {
  ref: "FeedbackAttachment",
  localField: "_id",
  foreignField: "feedbackId",
  justOne: false,
});
