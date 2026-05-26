import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StaffMemberDocument = HydratedDocument<StaffMember>;

@Schema({
  collection: "stock_control_staff_members",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StaffMember {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  employeeNumber: string;

  @Prop({ type: String, required: false })
  department: string;

  @Prop({ type: String, required: false })
  departmentId: string;

  @Prop({ type: String, required: false })
  photoUrl: string;

  @Prop({ type: String, required: true })
  qrToken: string;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  @Prop({ type: Number, required: false })
  departmentEntityId: number;
}

export const StaffMemberSchema = SchemaFactory.createForClass(StaffMember);

StaffMemberSchema.virtual("departmentEntity", {
  ref: "StockControlDepartment",
  localField: "departmentEntityId",
  foreignField: "_id",
  justOne: true,
});

StaffMemberSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StaffMemberSchema.virtual("allocations", {
  ref: "StockAllocation",
  localField: "_id",
  foreignField: "staffMemberId",
  justOne: false,
});

StaffMemberSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});
