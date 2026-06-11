import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SalesGoalDocument = HydratedDocument<SalesGoal>;

@Schema({
  collection: "annix_rep_sales_goals",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SalesGoal {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  period: string;

  @Prop({ type: Number, required: false })
  meetingsTarget: number;

  @Prop({ type: Number, required: false })
  visitsTarget: number;

  @Prop({ type: Number, required: false })
  newProspectsTarget: number;

  @Prop({ type: Number, required: false })
  revenueTarget: number;

  @Prop({ type: Number, required: false })
  dealsWonTarget: number;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const SalesGoalSchema = SchemaFactory.createForClass(SalesGoal);

SalesGoalSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
});
