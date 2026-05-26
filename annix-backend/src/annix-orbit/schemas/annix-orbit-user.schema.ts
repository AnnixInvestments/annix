import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitUserDocument = HydratedDocument<AnnixOrbitUser>;

@Schema({
  collection: "cv_assistant_users",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitUser {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: Boolean, required: true })
  emailVerified: boolean;

  @Prop({ type: String, required: false })
  emailVerificationToken: string;

  @Prop({ type: Date, required: false })
  emailVerificationExpires: Date;

  @Prop({ type: String, required: false })
  resetPasswordToken: string;

  @Prop({ type: Date, required: false })
  resetPasswordExpires: Date;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  matchAlertThreshold: number;

  @Prop({ type: Boolean, required: true })
  digestEnabled: boolean;

  @Prop({ type: Boolean, required: true })
  pushEnabled: boolean;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitUserSchema = SchemaFactory.createForClass(AnnixOrbitUser);

AnnixOrbitUserSchema.virtual("company", {
  ref: "AnnixOrbitCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
