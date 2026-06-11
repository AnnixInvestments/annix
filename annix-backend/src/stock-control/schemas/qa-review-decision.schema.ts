import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QaReviewDecisionDocument = HydratedDocument<QaReviewDecision>;

@Schema({
  collection: "qa_review_decisions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QaReviewDecision {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: Number, required: true })
  cycleNumber: number;

  @Prop({ type: Boolean, required: true })
  rubberApplicable: boolean;

  @Prop({ type: Boolean, required: true })
  paintApplicable: boolean;

  @Prop({ type: Boolean, required: false })
  rubberAccepted: boolean;

  @Prop({ type: Boolean, required: false })
  paintAccepted: boolean;

  @Prop({ type: Number, required: false })
  reviewedById: number;

  @Prop({ type: String, required: false })
  reviewedByName: string;

  @Prop({ type: Date, required: true })
  reviewedAt: Date;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const QaReviewDecisionSchema = SchemaFactory.createForClass(QaReviewDecision);

QaReviewDecisionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QaReviewDecisionSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

QaReviewDecisionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
