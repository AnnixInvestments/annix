import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StaffSignatureDocument = HydratedDocument<StaffSignature>;

@Schema({
  collection: "staff_signatures",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StaffSignature {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  signatureUrl: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUserId: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const StaffSignatureSchema = SchemaFactory.createForClass(StaffSignature);

StaffSignatureSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StaffSignatureSchema.virtual("user", {
  ref: "StockControlUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

StaffSignatureSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

StaffSignatureSchema.virtual("unifiedUser", {
  ref: "User",
  localField: "unifiedUserId",
  foreignField: "_id",
  justOne: true,
});
