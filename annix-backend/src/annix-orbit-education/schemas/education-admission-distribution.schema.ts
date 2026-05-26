import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type EducationAdmissionDistributionDocument =
  HydratedDocument<EducationAdmissionDistribution>;

@Schema({
  collection: "orbit_education_admission_distributions",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EducationAdmissionDistribution {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true })
  programmeId: string;

  @Prop({ type: Number, required: true })
  intakeYear: number;

  @Prop({ type: String, required: false })
  minAdmitted: string;

  @Prop({ type: String, required: false })
  medianAdmitted: string;

  @Prop({ type: String, required: false })
  p25Admitted: string;

  @Prop({ type: String, required: false })
  p75Admitted: string;

  @Prop({ type: Number, required: false })
  seats: number;

  @Prop({ type: String, required: false })
  source: string;

  @Prop({ type: String, required: false })
  asOf: string;

  @Prop({ type: Date, required: false })
  createdAt: Date;
}

export const EducationAdmissionDistributionSchema = SchemaFactory.createForClass(
  EducationAdmissionDistribution,
);
