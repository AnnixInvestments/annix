import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationInstitutionDocument = HydratedDocument<EducationInstitution>;

@Schema({
  collection: "orbit_education_institutions",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationInstitution {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: false })
  country: string;

  @Prop({ type: Object, required: false })
  defaultRequirementSpec: Record<string, unknown>;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const EducationInstitutionSchema = SchemaFactory.createForClass(EducationInstitution);
