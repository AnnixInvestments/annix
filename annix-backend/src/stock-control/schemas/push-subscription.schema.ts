import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type PushSubscriptionDocument = HydratedDocument<PushSubscription>;

@Schema({
  collection: "push_subscriptions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PushSubscription {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  endpoint: string;

  @Prop({ type: String, required: true })
  keyP256dh: string;

  @Prop({ type: String, required: true })
  keyAuth: string;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUserId: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscription);

PushSubscriptionSchema.virtual("user", {
  ref: "StockControlUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

PushSubscriptionSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

PushSubscriptionSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

PushSubscriptionSchema.virtual("unifiedUser", {
  ref: "User",
  localField: "unifiedUserId",
  foreignField: "_id",
  justOne: true,
});
