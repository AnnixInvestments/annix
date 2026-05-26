import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ExternalJobDocument = HydratedDocument<ExternalJob>;

@Schema({
  collection: "cv_assistant_external_jobs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ExternalJob {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  company: string;

  @Prop({ type: String, required: true })
  country: string;

  @Prop({ type: String, required: false })
  locationRaw: string;

  @Prop({ type: String, required: false })
  locationArea: string;

  @Prop({ type: Number, required: false })
  locationLat: number;

  @Prop({ type: Number, required: false })
  locationLon: number;

  @Prop({ type: Number, required: false })
  salaryMin: number;

  @Prop({ type: Number, required: false })
  salaryMax: number;

  @Prop({ type: String, required: false })
  salaryCurrency: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Object, required: true })
  extractedSkills: Record<string, unknown>;

  @Prop({ type: String, required: false })
  category: string;

  @Prop({ type: String, required: true })
  sourceExternalId: string;

  @Prop({ type: String, required: false })
  sourceUrl: string;

  @Prop({ type: Date, required: false })
  postedAt: Date;

  @Prop({ type: Date, required: false })
  expiresAt: Date;

  @Prop({ type: Date, required: false })
  lastSeenAt: Date;

  @Prop({ type: Number, required: true })
  sourceId: number;

  @Prop({ type: String, required: false })
  embedding: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const ExternalJobSchema = SchemaFactory.createForClass(ExternalJob);

ExternalJobSchema.virtual("source", {
  ref: "JobMarketSource",
  localField: "sourceId",
  foreignField: "_id",
  justOne: true,
});
