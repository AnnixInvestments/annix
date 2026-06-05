import type { JobCategoryKey } from "./job-categories";

export const AVAILABILITY_VALUES = [
  "available_now",
  "14d_notice",
  "30d_notice",
  "not_currently",
] as const;

export type Availability = (typeof AVAILABILITY_VALUES)[number];

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  available_now: "Available now",
  "14d_notice": "14 days notice",
  "30d_notice": "30 days notice",
  not_currently: "Not currently available",
};

export interface SharedWorkFields {
  fields: JobCategoryKey[];
  primaryRole: string | null;
  yearsExperience: number | null;
  availability: Availability | null;
  willingToTravelKm: number | null;
  topSkills: string[];
  certifications: string[];
  // Salary expectation (ZAR / year). User override of Nix's CV-derived suggestion;
  // null/absent means "use Nix's suggested band" (ExtractedCvData.suggestedSalary*).
  expectedSalaryMin?: number | null;
  expectedSalaryMax?: number | null;
}

export interface WorkProfile {
  shared: SharedWorkFields;
}

export function emptyWorkProfile(): WorkProfile {
  return {
    shared: {
      fields: [],
      primaryRole: null,
      yearsExperience: null,
      availability: null,
      willingToTravelKm: null,
      topSkills: [],
      certifications: [],
      expectedSalaryMin: null,
      expectedSalaryMax: null,
    },
  };
}
