import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AppRoleProductDocument = HydratedDocument<AppRoleProduct>;

@Schema({
  collection: "app_role_products",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AppRoleProduct {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  roleId: number;

  @Prop({ type: String, required: true })
  productKey: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const AppRoleProductSchema = SchemaFactory.createForClass(AppRoleProduct);

AppRoleProductSchema.virtual("role", {
  ref: "AppRole",
  localField: "roleId",
  foreignField: "_id",
  justOne: true,
});
