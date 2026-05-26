import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationProfileDocument = HydratedDocument<EducationProfile>;

@Schema({
  collection: "orbit_education_profiles",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationProfile {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Number, required: true })
  userId: number;

  @Prop({ type: String, required: true })
  curriculum: string;

  @Prop({ type: String, required: false })
  country: string;

  @Prop({ type: String, required: false })
  nationality: string;

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ type: String, required: false })
  school: string;

  @Prop({ type: String, required: false })
  dateOfBirth: string;

  @Prop({ type: String, required: true })
  jurisdiction: string;

  @Prop({ type: [String], required: false })
  targetCategories: string[];

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const EducationProfileSchema = SchemaFactory.createForClass(EducationProfile);
