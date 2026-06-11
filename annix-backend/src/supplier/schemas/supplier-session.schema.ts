import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SupplierSessionDocument = HydratedDocument<SupplierSession>;

@Schema({
  collection: "supplier_sessions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SupplierSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  supplierProfileId: number;

  @Prop({ type: String, required: true })
  sessionToken: string;

  @Prop({ type: String, required: false })
  refreshToken: string;

  @Prop({ type: String, required: true })
  deviceFingerprint: string;

  @Prop({ type: String, required: true })
  ipAddress: string;

  @Prop({ type: String, required: false })
  userAgent: string;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, required: true })
  lastActivity: Date;

  @Prop({ type: Date, required: false })
  invalidatedAt: Date;

  @Prop({ type: String, required: false })
  invalidationReason: string;
}

export const SupplierSessionSchema = SchemaFactory.createForClass(SupplierSession);

SupplierSessionSchema.virtual("supplierProfile", {
  ref: "SupplierProfile",
  localField: "supplierProfileId",
  foreignField: "_id",
  justOne: true,
});
