import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type UserAccessProductDocument = HydratedDocument<UserAccessProduct>;

@Schema({
  collection: "user_access_products",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserAccessProduct {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userAccessId: number;

  @Prop({ type: String, required: true })
  productKey: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const UserAccessProductSchema = SchemaFactory.createForClass(UserAccessProduct);

UserAccessProductSchema.virtual("userAccess", {
  ref: "UserAppAccess",
  localField: "userAccessId",
  foreignField: "_id",
  justOne: true,
});
