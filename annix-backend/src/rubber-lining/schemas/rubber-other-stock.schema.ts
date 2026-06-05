import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberOtherStockDocument = HydratedDocument<RubberOtherStock>;

@Schema({
  collection: "rubber_other_stock",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberOtherStock {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  itemCode: string;

  @Prop({ type: String, required: true })
  itemName: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: true })
  unitOfMeasure: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: true })
  minStockLevel: number;

  @Prop({ type: Number, required: true })
  reorderPoint: number;

  @Prop({ type: Number, required: false })
  costPerUnit: number;

  @Prop({ type: Number, required: false })
  pricePerUnit: number;

  @Prop({ type: String, required: false })
  location: string;

  @Prop({ type: Number, required: false })
  locationId: number;

  @Prop({ type: String, required: false })
  supplier: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  stockLocationId: number;
}

export const RubberOtherStockSchema = SchemaFactory.createForClass(RubberOtherStock);

RubberOtherStockSchema.virtual("stockLocation", {
  ref: "RubberStockLocation",
  localField: "stockLocationId",
  foreignField: "_id",
  justOne: true,
});
