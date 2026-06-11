import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlAdminTransferDocument = HydratedDocument<StockControlAdminTransfer>;

@Schema({
  collection: "stock_control_admin_transfers",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlAdminTransfer {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  initiatedById: number;

  @Prop({ type: String, required: true })
  targetEmail: string;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: String, required: false })
  newRoleForInitiator: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  acceptedAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedInitiatedById: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const StockControlAdminTransferSchema =
  SchemaFactory.createForClass(StockControlAdminTransfer);

StockControlAdminTransferSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockControlAdminTransferSchema.virtual("initiatedBy", {
  ref: "StockControlUser",
  localField: "initiatedById",
  foreignField: "_id",
  justOne: true,
});

StockControlAdminTransferSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

StockControlAdminTransferSchema.virtual("unifiedInitiatedBy", {
  ref: "User",
  localField: "unifiedInitiatedById",
  foreignField: "_id",
  justOne: true,
});
