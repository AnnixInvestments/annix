import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CompanyModuleSubscriptionDocument = HydratedDocument<CompanyModuleSubscription>;

@Schema({
  collection: "company_module_subscriptions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CompanyModuleSubscription {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  moduleCode: string;

  @Prop({ type: String, required: false })
  enabledAt: string;

  @Prop({ type: Date, required: false })
  disabledAt: Date;
}

export const CompanyModuleSubscriptionSchema =
  SchemaFactory.createForClass(CompanyModuleSubscription);

CompanyModuleSubscriptionSchema.virtual("company", {
  ref: "Company",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
