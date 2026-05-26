import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type StainlessSteelGradeDocument = HydratedDocument<StainlessSteelGrade>;

@Schema({
  collection: "stainless_steel_grades",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class StainlessSteelGrade {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  gradeNumber: string;

  @Prop({ type: String, required: false })
  unsNumber: string;

  @Prop({ type: String, required: false })
  enDesignation: string;

  @Prop({ type: String, required: false })
  enNumber: string;

  @Prop({ type: String, required: true })
  family: string;

  @Prop({ type: Number, required: false })
  carbonMaxPct: number;

  @Prop({ type: Number, required: false })
  chromiumMinPct: number;

  @Prop({ type: Number, required: false })
  chromiumMaxPct: number;

  @Prop({ type: Number, required: false })
  nickelMinPct: number;

  @Prop({ type: Number, required: false })
  nickelMaxPct: number;

  @Prop({ type: Number, required: false })
  molybdenumMinPct: number;

  @Prop({ type: Number, required: false })
  molybdenumMaxPct: number;

  @Prop({ type: Number, required: false })
  nitrogenMaxPct: number;

  @Prop({ type: String, required: false })
  otherElements: string;

  @Prop({ type: String, required: false })
  description: string;
}

export const StainlessSteelGradeSchema = SchemaFactory.createForClass(StainlessSteelGrade);
