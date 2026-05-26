import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlRbacConfigDocument = HydratedDocument<StockControlRbacConfig>;

@Schema({
  collection: "stock_control_rbac_config",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlRbacConfig {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  navKey: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: Number, required: false })
  unifiedCompanyId: number;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const StockControlRbacConfigSchema = SchemaFactory.createForClass(StockControlRbacConfig);
