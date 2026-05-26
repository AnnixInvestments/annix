import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type AnnixOrbitEeSectoralTargetDocument = HydratedDocument<AnnixOrbitEeSectoralTarget>;

@Schema({
  collection: "cv_assistant_ee_sectoral_targets",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitEeSectoralTarget {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  sectorCode: string;

  @Prop({ type: String, required: true })
  occupationalLevel: string;

  @Prop({ type: Number, required: true })
  targetYear: number;

  @Prop({ type: String, required: true })
  targetMetric: string;

  @Prop({ type: Number, required: true })
  targetPercent: number;

  @Prop({ type: String, required: false })
  gazetteReference: string;

  @Prop({ type: String, required: false })
  createdAt: string;
}

export const AnnixOrbitEeSectoralTargetSchema = SchemaFactory.createForClass(
  AnnixOrbitEeSectoralTarget,
);
