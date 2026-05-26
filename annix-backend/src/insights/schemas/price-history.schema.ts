import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PriceHistoryDocument = HydratedDocument<PriceHistory>;

@Schema({
  collection: "insights_price_history",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PriceHistory {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  assetId: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, required: true })
  open: number;

  @Prop({ type: Number, required: true })
  high: number;

  @Prop({ type: Number, required: true })
  low: number;

  @Prop({ type: Number, required: true })
  close: number;

  @Prop({ type: Number, required: false })
  adjClose: number;

  @Prop({ type: Number, required: false })
  volume: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const PriceHistorySchema = SchemaFactory.createForClass(PriceHistory);

PriceHistorySchema.virtual("asset", {
  ref: "Asset",
  localField: "assetId",
  foreignField: "_id",
  justOne: true,
});
