export enum SalaryBenchmarkSource {
  ADZUNA = "adzuna",
  INTERNAL = "internal",
  GEMINI_GROUNDED = "gemini_grounded",
}

export class SalaryBenchmark {
  id: number;

  normalizedTitle: string;

  industry: string | null;

  city: string | null;

  province: string | null;

  seniorityLevel: string | null;

  minSalary: string | null;

  medianSalary: string | null;

  maxSalary: string | null;

  sampleSize: number;

  source: SalaryBenchmarkSource;

  confidence: string;

  updatedAt: Date;
}
