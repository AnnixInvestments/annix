import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type NewsItemDocument = HydratedDocument<NewsItem>;

@Schema({
  collection: "insights_news_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class NewsItem {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  urlHash: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  source: string;

  @Prop({ type: String, required: false })
  summary: string;

  @Prop({ type: [String], required: false })
  relatedSymbols: string;

  @Prop({ type: [String], required: false })
  relatedThemes: string;

  @Prop({ type: Number, required: false })
  sentiment: number;

  @Prop({ type: String, required: false })
  impactLevel: string;

  @Prop({ type: String, required: false })
  shortTermImplication: string;

  @Prop({ type: String, required: false })
  mediumTermImplication: string;

  @Prop({ type: Date, required: false })
  publishedAt: Date;

  @Prop({ type: Date, required: false })
  extractedAt: Date;

  @Prop({ type: String, required: true })
  extractionStatus: string;

  @Prop({ type: String, required: false })
  extractionError: string;

  @Prop({ type: String, required: true })
  feedType: string;

  @Prop({ type: String, required: false })
  macroQuery: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const NewsItemSchema = SchemaFactory.createForClass(NewsItem);
