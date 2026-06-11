import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockTakeDocument = HydratedDocument<StockTake>;

@Schema({
  collection: "sm_stock_take",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockTake {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  periodLabel: string;

  @Prop({ type: Date, required: false })
  periodStart: Date;

  @Prop({ type: Date, required: false })
  periodEnd: Date;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: false })
  snapshotAt: Date;

  @Prop({ type: String, required: false })
  startedAt: string;

  @Prop({ type: Number, required: false })
  startedByStaffId: number;

  @Prop({ type: Date, required: false })
  submittedAt: Date;

  @Prop({ type: Number, required: false })
  submittedByStaffId: number;

  @Prop({ type: Date, required: false })
  approvedAt: Date;

  @Prop({ type: Number, required: false })
  approvedByStaffId: number;

  @Prop({ type: String, required: false })
  approverRole: string;

  @Prop({ type: Date, required: false })
  rejectedAt: Date;

  @Prop({ type: Number, required: false })
  rejectedByStaffId: number;

  @Prop({ type: String, required: false })
  rejectionReason: string;

  @Prop({ type: Date, required: false })
  postedAt: Date;

  @Prop({ type: Number, required: false })
  postedByStaffId: number;

  @Prop({ type: Number, required: false })
  valuationBeforeR: number;

  @Prop({ type: Number, required: false })
  valuationAfterR: number;

  @Prop({ type: Number, required: false })
  totalVarianceR: number;

  @Prop({ type: Number, required: false })
  totalVarianceAbsR: number;

  @Prop({ type: Boolean, required: true })
  requiresEscalatedReview: boolean;

  @Prop({ type: Boolean, required: true })
  requiresHighValueApproval: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const StockTakeSchema = SchemaFactory.createForClass(StockTake);

StockTakeSchema.virtual("lines", {
  ref: "StockTakeLine",
  localField: "_id",
  foreignField: "stockTakeId",
  justOne: false,
});
