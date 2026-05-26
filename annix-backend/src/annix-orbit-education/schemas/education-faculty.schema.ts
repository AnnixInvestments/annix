import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationFacultyDocument = HydratedDocument<EducationFaculty>;

@Schema({
  collection: "orbit_education_faculties",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationFaculty {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  institutionId: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Object, required: false })
  defaultRequirementSpec: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const EducationFacultySchema = SchemaFactory.createForClass(EducationFaculty);
