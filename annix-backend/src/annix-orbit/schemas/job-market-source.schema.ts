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

  @Prop({ type: Object, required: true })
  countryCodes: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  categories: Record<string, unknown>;

  @Prop({ type: Boolean, required: true })
  enabled: boolean;

  @Prop({ type: Number, required: true })
  rateLimitPerDay: number;

  @Prop({ type: Number, required: true })
  requestsToday: number;

  @Prop({ type: Date, required: false })
  requestsResetAt: Date;

  @Prop({ type: Date, required: false })
  lastIngestedAt: Date;

  @Prop({ type: Number, required: true })
  ingestionIntervalHours: number;

  @Prop({ type: Number, required: true })
  companyId: number;

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
