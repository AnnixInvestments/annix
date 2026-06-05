import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type SalaryBenchmarkDocument = HydratedDocument<SalaryBenchmark>;

@Schema({
  collection: "cv_assistant_salary_benchmarks",
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SalaryBenchmark {
  @Prop({ type: Number })
  _id: number;

  @Prop({ type: String, required: true })
  normalizedTitle: string;

  @Prop({ type: String, required: false })
  industry: string;

  @Prop({ type: String, required: false })
  city: string;

  @Prop({ type: String, required: false })
  province: string;

  @Prop({ type: String, required: false })
  seniorityLevel: string;

  @Prop({ type: Number, required: false })
  minSalary: number;

  @Prop({ type: Number, required: false })
  medianSalary: number;

  @Prop({ type: Number, required: false })
  maxSalary: number;

  @Prop({ type: Number, required: true })
  sampleSize: number;

  @Prop({ type: String, required: true })
  source: string;

  @Prop({ type: Number, required: true })
  confidence: number;

  @Prop({ type: Date, required: false })
  updatedAt: Date;
}

export const SalaryBenchmarkSchema = SchemaFactory.createForClass(SalaryBenchmark);
