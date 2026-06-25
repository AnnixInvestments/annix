import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockItemDocument = HydratedDocument<StockItem>;

@Schema({
  collection: "stock_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  sku: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: true })
  unitOfMeasure: string;

  @Prop({ type: Number, required: true })
  costPerUnit: number;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true, default: 0 })
  minStockLevel: number;

  @Prop({ type: String, required: false })
  location: string;

  @Prop({ type: String, required: false })
  locationId: string;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: Boolean, required: true, default: false })
  needsQrPrint: boolean;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  thicknessMm: number;

  @Prop({ type: Number, required: false })
  widthMm: number;

  @Prop({ type: Number, required: false })
  lengthM: number;

  @Prop({ type: String, required: false })
  color: string;

  @Prop({ type: String, required: false })
  compoundCode: string;

  @Prop({ type: Number, required: false })
  packSizeLitres: number;

  @Prop({ type: String, required: false })
  componentGroup: string;

  @Prop({ type: String, required: false })
  componentRole: string;

  @Prop({ type: String, required: false })
  mixRatio: string;

  @Prop({ type: String, required: false })
  rollNumber: string;

  @Prop({ type: Object, required: false })
  rollNumbers: Record<string, unknown>;

  @Prop({ type: String, required: false })
  sourceRollNumber: string;

  @Prop({ type: Boolean, required: true, default: false })
  isLeftover: boolean;

  @Prop({ type: String, required: false })
  sourceJobCardId: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  locationEntityId: number;
}

export const StockItemSchema = SchemaFactory.createForClass(StockItem);

StockItemSchema.virtual("locationEntity", {
  ref: "StockControlLocation",
  localField: "locationEntityId",
  foreignField: "_id",
  justOne: true,
});

StockItemSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockItemSchema.virtual("allocations", {
  ref: "StockAllocation",
  localField: "_id",
  foreignField: "stockItemId",
  justOne: false,
});

StockItemSchema.virtual("movements", {
  ref: "StockMovement",
  localField: "_id",
  foreignField: "stockItemId",
  justOne: false,
});

StockItemSchema.virtual("deliveryNoteItems", {
  ref: "DeliveryNoteItem",
  localField: "_id",
  foreignField: "stockItemId",
  justOne: false,
});

StockItemSchema.virtual("sourceJobCard", {
  ref: "JobCard",
  localField: "sourceJobCardId",
  foreignField: "_id",
  justOne: true,
});

StockItemSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
