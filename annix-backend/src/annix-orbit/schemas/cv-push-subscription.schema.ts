import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CvPushSubscriptionDocument = HydratedDocument<CvPushSubscription>;

@Schema({
  collection: "cv_assistant_push_subscriptions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CvPushSubscription {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, default: null })
  companyId: number | null;

  @Prop({ type: String, required: true })
  endpoint: string;

  @Prop({ type: String, required: true })
  keyP256dh: string;

  @Prop({ type: String, required: true })
  keyAuth: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const CvPushSubscriptionSchema = SchemaFactory.createForClass(CvPushSubscription);

CvPushSubscriptionSchema.virtual("user", {
  ref: "AnnixOrbitUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

CvPushSubscriptionSchema.virtual("company", {
  ref: "AnnixOrbitCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
