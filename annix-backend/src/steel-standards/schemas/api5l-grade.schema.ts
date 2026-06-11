import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type Api5lGradeDocument = HydratedDocument<Api5lGrade>;

@Schema({
  collection: "api5l_grades",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Api5lGrade {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  grade: string;

  @Prop({ type: String, required: true })
  pslLevel: string;

  @Prop({ type: Number, required: true })
  smysMpa: number;

  @Prop({ type: Number, required: true })
  smtsMpa: number;

  @Prop({ type: Number, required: true })
  elongationPctMin: number;

  @Prop({ type: Number, required: false })
  cvnTempC: number;

  @Prop({ type: Number, required: false })
  cvnAvgJ: number;

  @Prop({ type: Number, required: false })
  cvnMinJ: number;

  @Prop({ type: Number, required: true })
  carbonMaxPct: number;

  @Prop({ type: Number, required: true })
  manganeseMaxPct: number;

  @Prop({ type: Number, required: true })
  phosphorusMaxPct: number;

  @Prop({ type: Number, required: true })
  sulfurMaxPct: number;

  @Prop({ type: Number, required: false })
  ceqMax: number;

  @Prop({ type: Number, required: true })
  ndtCoveragePct: number;

  @Prop({ type: Boolean, required: true })
  heatTraceabilityRequired: boolean;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const Api5lGradeSchema = SchemaFactory.createForClass(Api5lGrade);
