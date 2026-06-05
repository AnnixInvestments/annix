import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StockControlInvitationDocument = HydratedDocument<StockControlInvitation>;

@Schema({
  collection: "stock_control_invitations",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StockControlInvitation {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  invitedById: number;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  acceptedAt: Date;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedInvitedById: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const StockControlInvitationSchema = SchemaFactory.createForClass(StockControlInvitation);

StockControlInvitationSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

StockControlInvitationSchema.virtual("invitedBy", {
  ref: "StockControlUser",
  localField: "invitedById",
  foreignField: "_id",
  justOne: true,
});

StockControlInvitationSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

StockControlInvitationSchema.virtual("unifiedInvitedBy", {
  ref: "User",
  localField: "unifiedInvitedById",
  foreignField: "_id",
  justOne: true,
});
