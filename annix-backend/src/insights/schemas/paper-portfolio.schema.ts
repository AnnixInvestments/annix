import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PaperPortfolioDocument = HydratedDocument<PaperPortfolio>;

@Schema({
  collection: "insights_paper_portfolios",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaperPortfolio {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  displayName: string;

  @Prop({ type: Number, required: true })
  startingCapital: number;

  @Prop({ type: Number, required: true })
  monthlyContribution: number;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: true })
  riskProfile: string;

  @Prop({ type: String, required: true })
  executorStrategy: string;

  @Prop({ type: Number, required: true })
  currentCashBalance: number;

  @Prop({ type: Number, required: true })
  currentPortfolioValue: number;

  @Prop({ type: Object, required: true })
  allocationRulesJson: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Boolean, required: true })
  isPaused: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PaperPortfolioSchema = SchemaFactory.createForClass(PaperPortfolio);

PaperPortfolioSchema.virtual("holdings", {
  ref: "PaperHolding",
  localField: "_id",
  foreignField: "portfolioId",
  justOne: false,
});

PaperPortfolioSchema.virtual("trades", {
  ref: "PaperTrade",
  localField: "_id",
  foreignField: "portfolioId",
  justOne: false,
});

PaperPortfolioSchema.virtual("snapshots", {
  ref: "PaperPortfolioSnapshot",
  localField: "_id",
  foreignField: "portfolioId",
  justOne: false,
});
