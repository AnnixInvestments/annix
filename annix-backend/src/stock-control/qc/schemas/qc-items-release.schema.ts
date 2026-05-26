import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcItemsReleaseDocument = HydratedDocument<QcItemsRelease>;

@Schema({
  collection: "qc_items_releases",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcItemsRelease {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  jobCardId: number;

  @Prop({ type: Number, required: false })
  cpoId: number;

  @Prop({ type: Number, required: true })
  version: number;

  @Prop({ type: Object, required: true })
  items: Record<string, unknown>;

  @Prop({ type: Number, required: true })
  totalQuantity: number;

  @Prop({ type: String, required: false })
  checkedByName: string;

  @Prop({ type: Date, required: false })
  checkedByDate: Date;

  @Prop({ type: String, required: false })
  checkedBySignature: string;

  @Prop({ type: Object, required: true })
  plsSignOff: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  mpsSignOff: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  clientSignOff: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  thirdPartySignOff: Record<string, unknown>;

  @Prop({ type: String, required: false })
  comments: string;

  @Prop({ type: String, required: true })
  createdByName: string;

  @Prop({ type: Number, required: false })
  createdById: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const QcItemsReleaseSchema = SchemaFactory.createForClass(QcItemsRelease);

QcItemsReleaseSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcItemsReleaseSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
