import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ReconciliationItemDocument = HydratedDocument<ReconciliationItem>;

@Schema({
  collection: "reconciliation_items",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ReconciliationItem {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  jobCardId: number;

  @Prop({ type: String, required: true })
  itemDescription: string;

  @Prop({ type: String, required: false })
  itemCode: string;

  @Prop({ type: Number, required: false })
  sourceDocumentId: number;

  @Prop({ type: String, required: true })
  sourceType: string;

  @Prop({ type: Number, required: true })
  quantityOrdered: number;

  @Prop({ type: Number, required: true })
  quantityReleased: number;

  @Prop({ type: Number, required: true })
  quantityShipped: number;

  @Prop({ type: Number, required: true })
  quantityMps: number;

  @Prop({ type: String, required: true })
  reconciliationStatus: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const ReconciliationItemSchema = SchemaFactory.createForClass(ReconciliationItem);

ReconciliationItemSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

ReconciliationItemSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
