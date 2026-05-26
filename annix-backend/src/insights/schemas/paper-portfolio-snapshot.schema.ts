import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PaperPortfolioSnapshotDocument = HydratedDocument<PaperPortfolioSnapshot>;

@Schema({
  collection: "insights_paper_portfolio_snapshots",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaperPortfolioSnapshot {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  portfolioId: string;

  @Prop({ type: Date, required: true })
  snapshotDate: Date;

  @Prop({ type: Number, required: true })
  totalValue: number;

  @Prop({ type: Number, required: true })
  cashBalance: number;

  @Prop({ type: Number, required: true })
  investedValue: number;

  @Prop({ type: Number, required: true })
  dailyReturnPercent: number;

  @Prop({ type: Number, required: true })
  totalReturnPercent: number;

  @Prop({ type: Number, required: true })
  maxDrawdownPercent: number;

  @Prop({ type: Number, required: true })
  volatilityScore: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const PaperPortfolioSnapshotSchema = SchemaFactory.createForClass(PaperPortfolioSnapshot);

PaperPortfolioSnapshotSchema.virtual("portfolio", {
  ref: "PaperPortfolio",
  localField: "portfolioId",
  foreignField: "_id",
  justOne: true,
});
