import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type UserLocationAssignmentDocument = HydratedDocument<UserLocationAssignment>;

@Schema({
  collection: "user_location_assignments",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class UserLocationAssignment {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: Number, required: true })
  locationId: number;

  @Prop({ type: String, required: false })
  unifiedCompanyId: string;

  @Prop({ type: String, required: false })
  unifiedUserId: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const UserLocationAssignmentSchema = SchemaFactory.createForClass(UserLocationAssignment);

UserLocationAssignmentSchema.virtual("company", {
  ref: "StockControlCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});

UserLocationAssignmentSchema.virtual("user", {
  ref: "StockControlUser",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});

UserLocationAssignmentSchema.virtual("location", {
  ref: "StockControlLocation",
  localField: "locationId",
  foreignField: "_id",
  justOne: true,
});

UserLocationAssignmentSchema.virtual("unifiedCompany", {
  ref: "Company",
  localField: "unifiedCompanyId",
  foreignField: "_id",
  justOne: true,
});

UserLocationAssignmentSchema.virtual("unifiedUser", {
  ref: "User",
  localField: "unifiedUserId",
  foreignField: "_id",
  justOne: true,
});
