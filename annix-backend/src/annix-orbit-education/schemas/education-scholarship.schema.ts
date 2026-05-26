import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationScholarshipDocument = HydratedDocument<EducationScholarship>;

@Schema({
  collection: "orbit_education_scholarships",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationScholarship {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String, required: false })
  country: string;

  @Prop({ type: String, required: false })
  amountDisplay: string;

  @Prop({ type: String, required: false })
  criteria: string;

  @Prop({ type: String, required: false })
  url: string;

  @Prop({ type: String, required: false })
  careerCluster: string;

  @Prop({ type: String, required: false })
  lastVerifiedAt: string;

  @Prop({ type: Boolean, required: true })
  active: boolean;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const EducationScholarshipSchema = SchemaFactory.createForClass(EducationScholarship);
