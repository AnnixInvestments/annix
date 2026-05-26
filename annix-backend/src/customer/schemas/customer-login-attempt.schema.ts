import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CustomerLoginAttemptDocument = HydratedDocument<CustomerLoginAttempt>;

@Schema({
  collection: "customer_login_attempts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CustomerLoginAttempt {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  customerProfileId: number;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: Boolean, required: true })
  success: boolean;

  @Prop({ type: String, required: false })
  failureReason: string;

  @Prop({ type: String, required: false })
  deviceFingerprint: string;

  @Prop({ type: String, required: true })
  ipAddress: string;

  @Prop({ type: String, required: false })
  userAgent: string;

  @Prop({ type: Boolean, required: true })
  ipMismatchWarning: boolean;

  @Prop({ type: String, required: false })
  attemptTime: string;
}

export const CustomerLoginAttemptSchema = SchemaFactory.createForClass(CustomerLoginAttempt);

CustomerLoginAttemptSchema.virtual("customerProfile", {
  ref: "CustomerProfile",
  localField: "customerProfileId",
  foreignField: "_id",
  justOne: true,
});
