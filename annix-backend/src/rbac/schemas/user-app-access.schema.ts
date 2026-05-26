import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type UserAppAccessDocument = HydratedDocument<UserAppAccess>;

@Schema({
  collection: "user_app_access",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserAppAccess {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, required: true })
  appId: number;

  @Prop({ type: Number, required: false })
  roleId: number;

  @Prop({ type: Boolean, required: true })
  useCustomPermissions: boolean;

  @Prop({ type: Number, required: false })
  grantedById: number;

  @Prop({ type: Date, required: false })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  grantedAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const UserAppAccessSchema = SchemaFactory.createForClass(UserAppAccess);

UserAppAccessSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

UserAppAccessSchema.virtual("app", {
  ref: "App",
  localField: "appId",
  foreignField: "_id",
  justOne: true,
});

UserAppAccessSchema.virtual("role", {
  ref: "AppRole",
  localField: "roleId",
  foreignField: "_id",
  justOne: true,
});

UserAppAccessSchema.virtual("grantedBy", {
  ref: "User",
  localField: "grantedById",
  foreignField: "_id",
  justOne: true,
});

UserAppAccessSchema.virtual("customPermissions", {
  ref: "UserAppPermission",
  localField: "_id",
  foreignField: "userAccessId",
  justOne: false,
});

UserAppAccessSchema.virtual("userProducts", {
  ref: "UserAccessProduct",
  localField: "_id",
  foreignField: "userAccessId",
  justOne: false,
});
