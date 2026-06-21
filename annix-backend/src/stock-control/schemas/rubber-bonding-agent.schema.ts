import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type RubberBondingAgentDocument = HydratedDocument<RubberBondingAgent>;

@Schema({
  collection: "rubber_bonding_agents",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class RubberBondingAgent {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: String, required: false, default: null })
  supplier: string | null;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: false, default: null })
  packSizeLitres: number | null;

  @Prop({ type: Number, required: false, default: null })
  pricePerTin: number | null;

  @Prop({ type: Number, required: false, default: null })
  pricePerLitre: number | null;

  @Prop({ type: Number, required: false, default: null })
  areaCoverPerLitre: number | null;

  @Prop({ type: String, required: true, default: "litre" })
  coverageBasis: string;

  @Prop({ type: Number, required: false, default: null })
  gramsPerM2: number | null;

  @Prop({ type: Boolean, required: true, default: true })
  active: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  preferred: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const RubberBondingAgentSchema = SchemaFactory.createForClass(RubberBondingAgent);

RubberBondingAgentSchema.index({ companyId: 1, supplier: 1, name: 1 });
