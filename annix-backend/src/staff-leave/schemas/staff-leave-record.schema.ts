import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StaffLeaveRecordDocument = HydratedDocument<StaffLeaveRecord>;

@Schema({
  collection: "staff_leave_records",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StaffLeaveRecord {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  leaveType: string;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: String, required: false })
  sickNoteUrl: string;

  @Prop({ type: String, required: false })
  sickNoteOriginalFilename: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUserId: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const StaffLeaveRecordSchema = SchemaFactory.createForClass(StaffLeaveRecord);

StaffLeaveRecordSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StaffLeaveRecordSchema.virtual("user", {
  ref: "StockControlUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

StaffLeaveRecordSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

StaffLeaveRecordSchema.virtual("unifiedUser", {
  ref: "User",
  localField: "unifiedUserId",
  foreignField: "_id",
  justOne: true,
});
