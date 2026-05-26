import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AppPermissionDocument = HydratedDocument<AppPermission>;

@Schema({
  collection: "app_permissions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AppPermission {
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

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const AppPermissionSchema = SchemaFactory.createForClass(AppPermission);

AppPermissionSchema.virtual("app", {
  ref: "App",
  localField: "appId",
  foreignField: "_id",
  justOne: true,
});

AppPermissionSchema.virtual("rolePermissions", {
  ref: "AppRolePermission",
  localField: "_id",
  foreignField: "permissionId",
  justOne: false,
});

AppPermissionSchema.virtual("userPermissions", {
  ref: "UserAppPermission",
  localField: "_id",
  foreignField: "permissionId",
  justOne: false,
});
