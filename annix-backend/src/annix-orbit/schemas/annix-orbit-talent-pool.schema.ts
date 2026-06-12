import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitTalentPoolDocument = HydratedDocument<AnnixOrbitTalentPool>;

@Schema({
  collection: "orbit_talent_pools",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitTalentPool {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: [Number], required: false })
  candidateIds: number[];

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitTalentPoolSchema = SchemaFactory.createForClass(AnnixOrbitTalentPool);
