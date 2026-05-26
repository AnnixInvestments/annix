import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AppRoleDocument = HydratedDocument<AppRole>;

@Schema({
  collection: "app_roles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AppRole {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  appId: number;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Boolean, required: true })
  isDefault: boolean;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: String, required: false })
  targetType: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AppRoleSchema = SchemaFactory.createForClass(AppRole);

AppRoleSchema.virtual("app", {
  ref: "App",
  localField: "appId",
  foreignField: "_id",
  justOne: true,
});

AppRoleSchema.virtual("rolePermissions", {
  ref: "AppRolePermission",
  localField: "_id",
  foreignField: "roleId",
  justOne: false,
});

AppRoleSchema.virtual("userAccess", {
  ref: "UserAppAccess",
  localField: "_id",
  foreignField: "roleId",
  justOne: false,
});

AppRoleSchema.virtual("roleProducts", {
  ref: "AppRoleProduct",
  localField: "_id",
  foreignField: "roleId",
  justOne: false,
});
