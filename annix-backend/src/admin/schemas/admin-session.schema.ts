import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AdminSessionDocument = HydratedDocument<AdminSession>;

@Schema({
  collection: "admin_sessions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AdminSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  sessionToken: string;

  @Prop({ type: String, required: true })
  clientIp: string;

  @Prop({ type: String, required: true })
  userAgent: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Boolean, required: true })
  isRevoked: boolean;

  @Prop({ type: Date, required: false })
  revokedAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  lastActiveAt: string;
}

export const AdminSessionSchema = SchemaFactory.createForClass(AdminSession);

AdminSessionSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
