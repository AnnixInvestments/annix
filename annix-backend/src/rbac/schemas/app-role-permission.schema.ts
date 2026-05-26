import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AppRolePermissionDocument = HydratedDocument<AppRolePermission>;

@Schema({
  collection: "app_role_permissions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AppRolePermission {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  roleId: number;

  @Prop({ type: Number, required: true })
  permissionId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const AppRolePermissionSchema = SchemaFactory.createForClass(AppRolePermission);

AppRolePermissionSchema.virtual("role", {
  ref: "AppRole",
  localField: "roleId",
  foreignField: "_id",
  justOne: true,
});

AppRolePermissionSchema.virtual("permission", {
  ref: "AppPermission",
  localField: "permissionId",
  foreignField: "_id",
  justOne: true,
});
