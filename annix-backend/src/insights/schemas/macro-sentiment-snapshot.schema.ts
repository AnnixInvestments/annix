import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type MacroSentimentSnapshotDocument = HydratedDocument<MacroSentimentSnapshot>;

@Schema({
  collection: "insights_macro_sentiment_snapshots",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class MacroSentimentSnapshot {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Date, required: true })
  snapshotDate: Date;

  @Prop({ type: Number, required: true })
  overallScore: number;

  @Prop({ type: Number, required: true })
  articleCount: number;

  @Prop({ type: Number, required: true })
  highImpactCount: number;

  @Prop({ type: Object, required: true })
  sectorBreakdown: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  commodityBreakdown: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const MacroSentimentSnapshotSchema = SchemaFactory.createForClass(MacroSentimentSnapshot);
