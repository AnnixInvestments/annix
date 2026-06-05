import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type ReinforcementPadStandardEntityDocument =
  HydratedDocument<ReinforcementPadStandardEntity>;

@Schema({
  collection: "reinforcement_pad_standards",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class ReinforcementPadStandardEntity {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  branchNps: string;

  @Prop({ type: Number, required: true })
  branchNbMm: number;

  @Prop({ type: String, required: true })
  headerNps: string;

  @Prop({ type: Number, required: true })
  headerNbMm: number;

  @Prop({ type: Number, required: true })
  minPadWidthMm: number;

  @Prop({ type: Number, required: true })
  minPadThicknessMm: number;

  @Prop({ type: Number, required: true })
  typicalWeightKg: number;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const ReinforcementPadStandardEntitySchema = SchemaFactory.createForClass(
  ReinforcementPadStandardEntity,
);
