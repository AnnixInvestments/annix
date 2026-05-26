import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlActionPermissionDocument = HydratedDocument<StockControlActionPermission>;

@Schema({
  collection: "stock_control_action_permissions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlActionPermission {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  actionKey: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const StockControlActionPermissionSchema = SchemaFactory.createForClass(
  StockControlActionPermission,
);
