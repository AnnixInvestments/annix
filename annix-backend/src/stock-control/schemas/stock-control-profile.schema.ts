import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlProfileDocument = HydratedDocument<StockControlProfile>;

@Schema({
  collection: "stock_control_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlProfile {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Boolean, required: true })
  hideTooltips: boolean;

  @Prop({ type: Boolean, required: true })
  emailNotificationsEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  pushNotificationsEnabled: boolean;

  @Prop({ type: String, required: false })
  linkedStaffId: string;

  @Prop({ type: Number, required: false })
  legacyScUserId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const StockControlProfileSchema = SchemaFactory.createForClass(StockControlProfile);

StockControlProfileSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

StockControlProfileSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockControlProfileSchema.virtual("linkedStaff", {
  ref: "StaffMember",
  localField: "linkedStaffId",
  foreignField: "_id",
  justOne: true,
});
