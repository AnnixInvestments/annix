import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: "user",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: false })
  username: string;

  @Prop({ type: String, required: false })
  email: string;

  @Prop({ type: String, required: false })
  firstName: string;

  @Prop({ type: String, required: false })
  lastName: string;

  @Prop({ type: String, required: false })
  passwordHash: string;

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

  @Prop({ type: String, required: false })
  oauthProvider: string;

  @Prop({ type: String, required: false })
  oauthId: string;

  @Prop({ type: String, required: false })
  appScope: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: Date, required: false })
  lastLoginAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;

  // TODO #298: relation needs embed-vs-ref review
  // many-to-many: roles
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual("rfqs", {
  ref: "Rfq",
  localField: "_id",
  foreignField: "createdById",
  justOne: false,
});
