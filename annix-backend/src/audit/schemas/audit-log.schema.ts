import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({
  collection: "audit_logs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AuditLog {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  entityType: string;

  @Prop({ type: Number, required: false })
  entityId: number;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: Object, required: false })
  oldValues: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  newValues: Record<string, unknown>;

  @Prop({ type: String, required: false })
  appName: string;

  @Prop({ type: String, required: false })
  subAction: string;

  @Prop({ type: Object, required: false })
  details: Record<string, unknown>;

  @Prop({ type: Number, required: false })
  companyId: number;

  @Prop({ type: Number, required: false })
  userIdRaw: number;

  @Prop({ type: String, required: false })
  ipAddress: string;

  @Prop({ type: String, required: false })
  userAgent: string;

  @Prop({ type: String, required: false })
  timestamp: string;

  @Prop({ type: Number, required: false })
  performedById: number;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.virtual("performedBy", {
  ref: "User",
  localField: "performedById",
  foreignField: "_id",
  justOne: true,
});
