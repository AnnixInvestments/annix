import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type QcpCustomerPreferenceDocument = HydratedDocument<QcpCustomerPreference>;

@Schema({
  collection: "qcp_customer_preferences",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class QcpCustomerPreference {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  customerName: string;

  @Prop({ type: String, required: false })
  customerEmail: string;

  @Prop({ type: String, required: true })
  planType: string;

  @Prop({ type: Object, required: false })
  interventionDefaults: Record<string, unknown>;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const QcpCustomerPreferenceSchema = SchemaFactory.createForClass(QcpCustomerPreference);

QcpCustomerPreferenceSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

QcpCustomerPreferenceSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
