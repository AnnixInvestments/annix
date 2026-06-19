export const ORBIT_JOB_STATUSES = [
  "open",
  "sourcing",
  "interviewing",
  "offer",
  "filled",
  "on_hold",
  "closed",
] as const;
export type AnnixOrbitJobStatus = (typeof ORBIT_JOB_STATUSES)[number];

export class AnnixOrbitJob {
  id: number;

  companyId: number;

  clientId: number | null;

  title: string;

  description: string | null;

  province: string | null;

  city: string | null;

  employmentType: string | null;

  salaryMin: number | null;

  salaryMax: number | null;

  requiredSkills: string[] | null;

  // Gemini embedding over title/description/skills, refreshed in the
  // background on create/update (issue #337 embedding matching).
  embedding: number[] | null;

  openings: number;

  status: AnnixOrbitJobStatus;

  closingDate: string | null;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
