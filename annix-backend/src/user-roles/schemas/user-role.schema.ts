import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type UserRoleDocument = HydratedDocument<UserRole>;

@Schema({
  collection: "user_role",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserRole {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;

  // TODO #298: relation needs embed-vs-ref review
  // many-to-many: users
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRole);
