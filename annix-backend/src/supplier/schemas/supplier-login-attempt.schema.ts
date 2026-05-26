import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierLoginAttemptDocument = HydratedDocument<SupplierLoginAttempt>;

@Schema({
  collection: "supplier_login_attempts",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierLoginAttempt {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: false })
  supplierProfileId: number;

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

export const SupplierLoginAttemptSchema = SchemaFactory.createForClass(SupplierLoginAttempt);

SupplierLoginAttemptSchema.virtual("supplierProfile", {
  ref: "SupplierProfile",
  localField: "supplierProfileId",
  foreignField: "_id",
  justOne: true,
});
