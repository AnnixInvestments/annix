import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SourceRespectRankDocument = HydratedDocument<SourceRespectRank>;

@Schema({
  collection: "cv_assistant_source_respect_ranks",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SourceRespectRank {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true, unique: true })
  provider: string;

  @Prop({ type: Number, required: true })
  rank: number;

  @Prop({ type: String, required: false })
  label: string;

  @Prop({ type: String, required: false })
  rationale: string;
}

export const SourceRespectRankSchema = SchemaFactory.createForClass(SourceRespectRank);
