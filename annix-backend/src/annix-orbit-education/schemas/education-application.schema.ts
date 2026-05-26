import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationApplicationDocument = HydratedDocument<EducationApplication>;

@Schema({
  collection: "orbit_education_applications",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationApplication {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  educationProfileId: string;

  @Prop({ type: String, required: false })
  programmeId: string;

  @Prop({ type: String, required: true })
  institutionName: string;

  @Prop({ type: String, required: true })
  programmeName: string;

  @Prop({ type: String, required: true })
  status: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const EducationApplicationSchema = SchemaFactory.createForClass(EducationApplication);
