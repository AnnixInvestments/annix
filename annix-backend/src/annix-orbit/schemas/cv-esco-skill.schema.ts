import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CvEscoSkillDocument = HydratedDocument<CvEscoSkill>;

@Schema({
  collection: "cv_assistant_esco_skills",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class CvEscoSkill {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  escoUri: string;

  @Prop({ type: String, required: true })
  preferredLabel: string;

  @Prop({ type: Object, required: true })
  altLabels: Record<string, unknown>;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const CvEscoSkillSchema = SchemaFactory.createForClass(CvEscoSkill);
