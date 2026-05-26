import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type WatchlistItemDocument = HydratedDocument<WatchlistItem>;

@Schema({
  collection: "insights_watchlist_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class WatchlistItem {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  assetId: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  targetReason: string;

  @Prop({ type: Date, required: false })
  addedAt: Date;
}

export const WatchlistItemSchema = SchemaFactory.createForClass(WatchlistItem);

WatchlistItemSchema.virtual("asset", {
  ref: "Asset",
  localField: "assetId",
  foreignField: "_id",
  justOne: true,
});
