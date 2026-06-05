import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockMovementDocument = HydratedDocument<StockMovement>;

@Schema({
  collection: "stock_movements",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockMovement {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  movementType: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: false })
  referenceType: string;

  @Prop({ type: Number, required: false })
  referenceId: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdBy: string;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Number, required: false })
  stockItemId: number;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

StockMovementSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

StockMovementSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockMovementSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
