import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type DashboardPreferenceDocument = HydratedDocument<DashboardPreference>;

@Schema({
  collection: "dashboard_preferences",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class DashboardPreference {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Object, required: true })
  pinnedWidgets: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  hiddenWidgets: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  widgetOrder: Record<string, unknown>;

  @Prop({ type: String, required: false })
  viewOverride: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUserId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const DashboardPreferenceSchema = SchemaFactory.createForClass(DashboardPreference);

DashboardPreferenceSchema.virtual("user", {
  ref: "StockControlUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

DashboardPreferenceSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

DashboardPreferenceSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

DashboardPreferenceSchema.virtual("unifiedUser", {
  ref: "User",
  localField: "unifiedUserId",
  foreignField: "_id",
  justOne: true,
});
