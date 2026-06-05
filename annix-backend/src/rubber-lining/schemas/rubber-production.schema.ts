import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberProductionDocument = HydratedDocument<RubberProduction>;

@Schema({
  collection: "rubber_productions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberProduction {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  firebaseUid: string;

  @Prop({ type: String, required: true })
  productionNumber: string;

  @Prop({ type: Number, required: true })
  productId: number;

  @Prop({ type: Number, required: true })
  compoundStockId: number;

  @Prop({ type: Number, required: true })
  thicknessMm: number;

  @Prop({ type: Number, required: true })
  widthMm: number;

  @Prop({ type: Number, required: true })
  lengthM: number;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Number, required: false })
  compoundUsedKg: number;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Number, required: false })
  orderId: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Date, required: false })
  completedAt: Date;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberProductionSchema = SchemaFactory.createForClass(RubberProduction);

RubberProductionSchema.virtual("product", {
  ref: "RubberProduct",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

RubberProductionSchema.virtual("compoundStock", {
  ref: "RubberCompoundStock",
  localField: "compoundStockId",
  foreignField: "_id",
  justOne: true,
});
