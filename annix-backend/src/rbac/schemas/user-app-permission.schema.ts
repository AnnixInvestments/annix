import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type UserAppPermissionDocument = HydratedDocument<UserAppPermission>;

@Schema({
  collection: "user_app_permissions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserAppPermission {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userAccessId: number;

  @Prop({ type: Number, required: true })
  permissionId: number;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const UserAppPermissionSchema = SchemaFactory.createForClass(UserAppPermission);

UserAppPermissionSchema.virtual("userAccess", {
  ref: "UserAppAccess",
  localField: "userAccessId",
  foreignField: "_id",
  justOne: true,
});

UserAppPermissionSchema.virtual("permission", {
  ref: "AppPermission",
  localField: "permissionId",
  foreignField: "_id",
  justOne: true,
});
