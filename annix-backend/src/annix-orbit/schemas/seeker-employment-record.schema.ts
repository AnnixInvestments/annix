import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SeekerEmploymentRecordDocument = HydratedDocument<SeekerEmploymentRecord>;

@Schema({
  collection: "cv_assistant_seeker_employment_records",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SeekerEmploymentRecord {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  candidateId: number;

  @Prop({ type: Number, required: false })
  applyClickId: number;

  @Prop({ type: Number, required: false })
  externalJobId: number;

  @Prop({ type: String, required: false })
  employerName: string;

  @Prop({ type: String, required: false })
  companyWebsiteUrl: string;

  @Prop({ type: String, required: false })
  roleTitle: string;

  @Prop({ type: String, required: false })
  roleOutline: string;

  @Prop({ type: Date, required: false })
  startDate: Date;

  @Prop({ type: Date, required: false })
  endDate: Date;

  @Prop({ type: String, required: false, default: "active" })
  status: string;

  @Prop({ type: String, required: false, default: "pending" })
  researchStatus: string;

  @Prop({ type: Date, required: false })
  researchedAt: Date;

  @Prop({ type: Date, required: false })
  appliedToCvAt: Date;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const SeekerEmploymentRecordSchema = SchemaFactory.createForClass(SeekerEmploymentRecord);
