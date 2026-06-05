import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type IssuanceBatchRecordDocument = HydratedDocument<IssuanceBatchRecord>;

@Schema({
  collection: "issuance_batch_records",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class IssuanceBatchRecord {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  stockIssuanceId: number;

  @Prop({ type: Number, required: true })
  stockItemId: number;

  @Prop({ type: String, required: false })
  jobCardId: string;

  @Prop({ type: String, required: false })
  sessionId: string;

  @Prop({ type: String, required: false })
  cpoId: string;

  @Prop({ type: String, required: true })
  batchNumber: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: false })
  supplierCertificateId: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const IssuanceBatchRecordSchema = SchemaFactory.createForClass(IssuanceBatchRecord);

IssuanceBatchRecordSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

IssuanceBatchRecordSchema.virtual("stockIssuance", {
  ref: "StockIssuance",
  localField: "stockIssuanceId",
  foreignField: "_id",
  justOne: true,
});

IssuanceBatchRecordSchema.virtual("stockItem", {
  ref: "StockItem",
  localField: "stockItemId",
  foreignField: "_id",
  justOne: true,
});

IssuanceBatchRecordSchema.virtual("jobCard", {
  ref: "JobCard",
  localField: "jobCardId",
  foreignField: "_id",
  justOne: true,
});

IssuanceBatchRecordSchema.virtual("session", {
  ref: "IssuanceSession",
  localField: "sessionId",
  foreignField: "_id",
  justOne: true,
});

IssuanceBatchRecordSchema.virtual("cpo", {
  ref: "CustomerPurchaseOrder",
  localField: "cpoId",
  foreignField: "_id",
  justOne: true,
});

IssuanceBatchRecordSchema.virtual("supplierCertificate", {
  ref: "SupplierCertificate",
  localField: "supplierCertificateId",
  foreignField: "_id",
  justOne: true,
});

IssuanceBatchRecordSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
