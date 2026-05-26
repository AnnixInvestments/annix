import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationProgrammeDocument = HydratedDocument<EducationProgramme>;

@Schema({
  collection: "orbit_education_programmes",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationProgramme {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  institutionId: string;

  @Prop({ type: String, required: false })
  facultyId: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  careerCluster: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const EducationProgrammeSchema = SchemaFactory.createForClass(EducationProgramme);
