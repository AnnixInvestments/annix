import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockTakeVarianceCategoryDocument = HydratedDocument<StockTakeVarianceCategory>;

@Schema({
  collection: "sm_stock_take_variance_category",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockTakeVarianceCategory {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: Boolean, required: true })
  requiresPhoto: boolean;

  @Prop({ type: Boolean, required: true })
  requiresIncidentRef: boolean;

  @Prop({ type: [String], required: true })
  notifyOnSubmit: string;

  @Prop({ type: String, required: true })
  severity: string;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const StockTakeVarianceCategorySchema =
  SchemaFactory.createForClass(StockTakeVarianceCategory);
