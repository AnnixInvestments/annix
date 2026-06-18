import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixSentinelRegulatoryUpdateDocument = HydratedDocument<AnnixSentinelRegulatoryUpdate>;

@Schema({
  collection: "comply_sa_regulatory_updates",
  timestamps: { createdAt: false, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixSentinelRegulatoryUpdate {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  summary: string;

  @Prop({ type: String, required: true })
  category: string;

  @Prop({ type: Date, required: false })
  effectiveDate: Date | null;

  @Prop({ type: String, required: false })
  sourceUrl: string | null;

  @Prop({ type: [String], required: false })
  affectedRequirementCodes: string[] | null;

  @Prop({ type: Date, required: false })
  publishedAt: Date;
}

export const AnnixSentinelRegulatoryUpdateSchema = SchemaFactory.createForClass(
  AnnixSentinelRegulatoryUpdate,
);
