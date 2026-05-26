import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ExternalJobAlternateDocument = HydratedDocument<ExternalJobAlternate>;

@Schema({
  collection: "cv_assistant_external_job_alternates",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ExternalJobAlternate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  canonicalExternalJobId: number;

  @Prop({ type: Number, required: true })
  sourceId: number;

  @Prop({ type: String, required: true })
  sourceExternalId: string;

  @Prop({ type: String, required: false })
  sourceUrl: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  company: string;

  @Prop({ type: String, required: false })
  locationArea: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: Number, required: false })
  canonicalJobId: number;
}

export const ExternalJobAlternateSchema = SchemaFactory.createForClass(ExternalJobAlternate);

ExternalJobAlternateSchema.virtual("canonicalJob", {
  ref: "ExternalJob",
  localField: "canonicalJobId",
  foreignField: "_id",
  justOne: true,
});

ExternalJobAlternateSchema.virtual("source", {
  ref: "JobMarketSource",
  localField: "sourceId",
  foreignField: "_id",
  justOne: true,
});
