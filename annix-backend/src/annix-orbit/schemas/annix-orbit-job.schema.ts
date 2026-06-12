import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import type { AnnixOrbitJobStatus } from "../entities/annix-orbit-job.entity";

export type AnnixOrbitJobDocument = HydratedDocument<AnnixOrbitJob>;

@Schema({
  collection: "orbit_jobs",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class AnnixOrbitJob {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: Number, required: true })
  companyId: number;

  @Prop({ type: Number, required: false })
  clientId: number;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  city: string;

  @Prop({ type: String, required: false })
  employmentType: string;

  @Prop({ type: Number, required: false })
  salaryMin: number;

  @Prop({ type: Number, required: false })
  salaryMax: number;

  @Prop({ type: [String], required: false })
  requiredSkills: string[];

  @Prop({ type: [Number], required: false })
  embedding: number[];

  @Prop({ type: Number, required: false, default: 1 })
  openings: number;

  @Prop({ type: String, required: false, default: "open" })
  status: AnnixOrbitJobStatus;

  @Prop({ type: String, required: false })
  closingDate: string;

  @Prop({ type: String, required: false })
  notes: string;

  @Prop({ type: String, required: false })
  createdAt: string;

  @Prop({ type: String, required: false })
  updatedAt: string;
}

export const AnnixOrbitJobSchema = SchemaFactory.createForClass(AnnixOrbitJob);
