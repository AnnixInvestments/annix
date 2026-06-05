import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlCompanyRoleDocument = HydratedDocument<StockControlCompanyRole>;

@Schema({
  collection: "stock_control_company_roles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlCompanyRole {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  key: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: Boolean, required: true })
  isSystem: boolean;

  @Prop({ type: Number, required: true })
  sortOrder: number;

  @Prop({ type: Number, required: false })
  unifiedCompanyId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const StockControlCompanyRoleSchema = SchemaFactory.createForClass(StockControlCompanyRole);
