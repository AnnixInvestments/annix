import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberCompoundStockDocument = HydratedDocument<RubberCompoundStock>;

@Schema({
  collection: "rubber_compound_stock",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberCompoundStock {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: Number, required: true })
  compoundCodingId: number;

  @Prop({ type: Number, required: true })
  quantityKg: number;

  @Prop({ type: Number, required: true })
  minStockLevelKg: number;

  @Prop({ type: Number, required: true })
  reorderPointKg: number;

  @Prop({ type: Number, required: false })
  costPerKg: number;

  @Prop({ type: String, required: false })
  location: string;

  @Prop({ type: Number, required: false })
  locationId: number;

  @Prop({ type: String, required: false })
  batchNumber: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  @Prop({ type: Number, required: false })
  stockLocationId: number;
}

export const RubberCompoundStockSchema = SchemaFactory.createForClass(RubberCompoundStock);

RubberCompoundStockSchema.virtual("compoundCoding", {
  ref: "RubberProductCoding",
  localField: "compoundCodingId",
  foreignField: "_id",
  justOne: true,
});

RubberCompoundStockSchema.virtual("stockLocation", {
  ref: "RubberStockLocation",
  localField: "stockLocationId",
  foreignField: "_id",
  justOne: true,
});
