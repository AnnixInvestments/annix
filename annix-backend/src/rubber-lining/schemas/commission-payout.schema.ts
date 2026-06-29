import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CommissionPayoutDocument = HydratedDocument<CommissionPayout>;

@Schema({
  collection: "rubber_commission_payouts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CommissionPayout {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  commissionType: string;

  @Prop({ type: Number, required: false })
  salesRepId: number;

  @Prop({ type: Number, required: false })
  affiliateId: number;

  @Prop({ type: Number, required: true })
  invoiceId: number;

  @Prop({ type: Number, required: true })
  customerId: number;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: String, required: true })
  invoiceNumber: string;

  @Prop({ type: Number, required: true })
  invoiceTotal: number;

  @Prop({ type: Number, required: true })
  commissionRate: number;

  @Prop({ type: Number, required: true })
  commissionAmount: number;

  @Prop({ type: String, required: true, default: "PENDING" })
  status: string;

  @Prop({ type: String, required: true, default: "MANUAL" })
  releaseSource: string;

  @Prop({ type: Number, required: false })
  bankReconId: number;

  @Prop({ type: Date, required: false })
  paidAt: Date;

  @Prop({ type: String, required: false })
  paidBy: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const CommissionPayoutSchema = SchemaFactory.createForClass(CommissionPayout);
