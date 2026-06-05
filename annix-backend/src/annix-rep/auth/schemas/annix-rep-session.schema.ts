import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixRepSessionDocument = HydratedDocument<AnnixRepSession>;

@Schema({
  collection: "annix_rep_sessions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixRepSession {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  sessionToken: string;

  @Prop({ type: String, required: false })
  refreshToken: string;

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

export const AnnixRepSessionSchema = SchemaFactory.createForClass(AnnixRepSession);

AnnixRepSessionSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
