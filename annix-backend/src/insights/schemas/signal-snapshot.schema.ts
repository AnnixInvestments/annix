import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SignalSnapshotDocument = HydratedDocument<SignalSnapshot>;

@Schema({
  collection: "insights_signal_snapshots",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SignalSnapshot {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  assetId: string;

  @Prop({ type: Date, required: true })
  snapshotDate: Date;

  @Prop({ type: Number, required: true })
  momentumScore: number;

  @Prop({ type: Number, required: true })
  valuationScore: number;

  @Prop({ type: Number, required: true })
  newsSentimentScore: number;

  @Prop({ type: Number, required: true })
  sectorTrendScore: number;

  @Prop({ type: Number, required: true })
  drawdownRiskScore: number;

  @Prop({ type: Number, required: true })
  opportunityScore: number;

  @Prop({ type: Number, required: true })
  riskScore: number;

  @Prop({ type: Number, required: true })
  confidenceScore: number;

  @Prop({ type: Object, required: true })
  componentBreakdownJson: Record<string, unknown>;

  @Prop({ type: String, required: true })
  marketRegime: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const SignalSnapshotSchema = SchemaFactory.createForClass(SignalSnapshot);

SignalSnapshotSchema.virtual("asset", {
  ref: "Asset",
  localField: "assetId",
  foreignField: "_id",
  justOne: true,
});
