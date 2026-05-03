import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export enum SalaryBenchmarkSource {
  ADZUNA = "adzuna",
  INTERNAL = "internal",
  GEMINI_GROUNDED = "gemini_grounded",
}

@Entity("cv_assistant_salary_benchmarks")
export class SalaryBenchmark {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "normalized_title", type: "text" })
  normalizedTitle: string;

  @Column({ type: "text", nullable: true })
  industry: string | null;

  @Column({ type: "text", nullable: true })
  city: string | null;

  @Column({ type: "text", nullable: true })
  province: string | null;

  @Column({ name: "seniority_level", type: "text", nullable: true })
  seniorityLevel: string | null;

  @Column({ name: "min_salary", type: "decimal", precision: 12, scale: 2, nullable: true })
  minSalary: string | null;

  @Column({ name: "median_salary", type: "decimal", precision: 12, scale: 2, nullable: true })
  medianSalary: string | null;

  @Column({ name: "max_salary", type: "decimal", precision: 12, scale: 2, nullable: true })
  maxSalary: string | null;

  @Column({ name: "sample_size", type: "int", default: 0 })
  sampleSize: number;

  @Column({ type: "varchar", length: 32 })
  source: SalaryBenchmarkSource;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  confidence: string;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
