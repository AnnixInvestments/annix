import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlUserDocument = HydratedDocument<StockControlUser>;

@Schema({
  collection: "stock_control_users",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlUser {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: Boolean, required: true })
  emailVerified: boolean;

  @Prop({ type: String, required: false })
  emailVerificationToken: string;

  @Prop({ type: Date, required: false })
  emailVerificationExpires: Date;

  @Prop({ type: String, required: false })
  resetPasswordToken: string;

  @Prop({ type: Date, required: false })
  resetPasswordExpires: Date;

  @Prop({ type: Boolean, required: true })
  hideTooltips: boolean;

  @Prop({ type: Boolean, required: true })
  emailNotificationsEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  pushNotificationsEnabled: boolean;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  linkedStaffId: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: Number, required: false })
  unifiedUserId: number;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const StockControlUserSchema = SchemaFactory.createForClass(StockControlUser);

StockControlUserSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockControlUserSchema.virtual("linkedStaff", {
  ref: "StaffMember",
  localField: "linkedStaffId",
  foreignField: "_id",
  justOne: true,
});

StockControlUserSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
