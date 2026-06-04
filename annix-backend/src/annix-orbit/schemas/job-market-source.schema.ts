import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type JobMarketSourceDocument = HydratedDocument<JobMarketSource>;

@Schema({
  collection: "cv_assistant_job_market_sources",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class JobMarketSource {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  apiId: string;

  @Prop({ type: String, required: false })
  apiKeyEncrypted: string;

  @Prop({ type: Object, required: true, default: ["za"] })
  countryCodes: Record<string, unknown>;

  @Prop({ type: Object, required: true, default: [] })
  categories: Record<string, unknown>;

  @Prop({ type: [String], required: false, default: null })
  visibleTiers: string[] | null;

  @Prop({ type: Boolean, required: true, default: true })
  enabled: boolean;

  @Prop({ type: Number, required: true, default: 250 })
  rateLimitPerDay: number;

  @Prop({ type: Number, required: true, default: 0 })
  requestsToday: number;

  @Prop({ type: Date, required: false })
  requestsResetAt: Date;

  @Prop({ type: Date, required: false })
  lastIngestedAt: Date;

  @Prop({ type: Date, required: false })
  lastHealthAlertAt: Date;

  @Prop({ type: Number, required: true, default: 6 })
  ingestionIntervalHours: number;

  @Prop({ type: Boolean, required: true, default: true })
  requiresVetting: boolean;

  @Prop({ type: Number, required: false, default: null })
  companyId: number | null;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const JobMarketSourceSchema = SchemaFactory.createForClass(JobMarketSource);

JobMarketSourceSchema.virtual("company", {
  ref: "AnnixOrbitCompany",
  localField: "companyId",
  foreignField: "_id",
  justOne: true,
});
