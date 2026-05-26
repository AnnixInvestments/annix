import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PaperHoldingDocument = HydratedDocument<PaperHolding>;

@Schema({
  collection: "insights_paper_holdings",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaperHolding {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  portfolioId: string;

  @Prop({ type: String, required: true })
  assetId: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  averageBuyPrice: number;

  @Prop({ type: Number, required: true })
  currentPrice: number;

  @Prop({ type: Number, required: true })
  marketValue: number;

  @Prop({ type: Number, required: true })
  unrealisedGainLoss: number;

  @Prop({ type: Number, required: true })
  unrealisedGainLossPercent: number;

  @Prop({ type: Date, required: false })
  firstAcquiredAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const PaperHoldingSchema = SchemaFactory.createForClass(PaperHolding);

PaperHoldingSchema.virtual("portfolio", {
  ref: "PaperPortfolio",
  localField: "portfolioId",
  foreignField: "_id",
  justOne: true,
});

PaperHoldingSchema.virtual("asset", {
  ref: "Asset",
  localField: "assetId",
  foreignField: "_id",
  justOne: true,
});
