import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { AnnixOrbitShortlistStatus } from "../entities/annix-orbit-shortlist.entity";

export type AnnixOrbitShortlistDocument = HydratedDocument<AnnixOrbitShortlist>;

@Schema({
  collection: "orbit_shortlists",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitShortlist {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  jobTitle: string;

  @Prop({ type: Number, required: false })
  clientId: number;

  @Prop({ type: [Number], required: false })
  candidateIds: number[];

  @Prop({ type: String, required: false, default: "draft" })
  status: AnnixOrbitShortlistStatus;

  @Prop({ type: String, required: false })
  shareToken: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitShortlistSchema = SchemaFactory.createForClass(AnnixOrbitShortlist);
