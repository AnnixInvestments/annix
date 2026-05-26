import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PaperTradeDocument = HydratedDocument<PaperTrade>;

@Schema({
  collection: "insights_paper_trades",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaperTrade {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  portfolioId: string;

  @Prop({ type: String, required: false })
  assetId: string;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Number, required: true })
  tradeValue: number;

  @Prop({ type: Number, required: true })
  fees: number;

  @Prop({ type: String, required: true })
  appReasoning: string;

  @Prop({ type: Number, required: false })
  opportunityScore: number;

  @Prop({ type: Number, required: false })
  riskScore: number;

  @Prop({ type: Number, required: false })
  confidenceScore: number;

  @Prop({ type: String, required: false })
  marketRegime: string;

  @Prop({ type: Object, required: false })
  signalSnapshot: Record<string, unknown>;

  @Prop({ type: [String], required: false })
  relatedNewsIds: string;

  @Prop({ type: Object, required: false })
  newsConsidered: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  executedAt: Date;
}

export const PaperTradeSchema = SchemaFactory.createForClass(PaperTrade);

PaperTradeSchema.virtual("portfolio", {
  ref: "PaperPortfolio",
  localField: "portfolioId",
  foreignField: "_id",
  justOne: true,
});

PaperTradeSchema.virtual("asset", {
  ref: "Asset",
  localField: "assetId",
  foreignField: "_id",
  justOne: true,
});
