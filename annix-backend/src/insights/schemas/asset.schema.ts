import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AssetDocument = HydratedDocument<Asset>;

@Schema({
  collection: "insights_assets",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Asset {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  symbol: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  exchange: string;

  @Prop({ type: String, required: true })
  currency: string;

  @Prop({ type: String, required: true })
  assetType: string;

  @Prop({ type: String, required: false })
  sector: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Number, required: false })
  trailingPe: number;

  @Prop({ type: Date, required: false })
  peUpdatedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);

AssetSchema.virtual("watchlistItems", {
  ref: "WatchlistItem",
  localField: "_id",
  foreignField: "assetId",
  justOne: false,
});
