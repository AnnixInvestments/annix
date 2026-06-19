export const ORBIT_CANDIDATE_VISIBILITIES = ["private", "agency", "public"] as const;
export type AnnixOrbitCandidateVisibility = (typeof ORBIT_CANDIDATE_VISIBILITIES)[number];

export const ORBIT_CANDIDATE_STATUSES = ["active", "placed", "do_not_contact", "archived"] as const;
export type AnnixOrbitTalentCandidateStatus = (typeof ORBIT_CANDIDATE_STATUSES)[number];

// Canonical recruiter pipeline stage the candidate sits at (issue #362).
// Only identified/screened/shortlisted are set manually; submitted+ are
// derived from submissions/placements (see recruiter-pipeline.ts).
export const ORBIT_PIPELINE_STAGES = [
  "identified",
  "screened",
  "shortlisted",
  "submitted",
  "interview",
  "offer",
  "placed",
] as const;
export type OrbitPipelineStage = (typeof ORBIT_PIPELINE_STAGES)[number];

// Where the candidate came into the pool — powers the dashboard source
// breakdown donut.
export const ORBIT_CANDIDATE_SOURCES = [
  "database",
  "referral",
  "website",
  "social",
  "job_board",
  "other",
] as const;
export type AnnixOrbitCandidateSource = (typeof ORBIT_CANDIDATE_SOURCES)[number];

export class AnnixOrbitTalentCandidate {
  id: number;

  companyId: number;

  ownerUserId: number;

  visibility: AnnixOrbitCandidateVisibility;

  fullName: string;

  email: string | null;

  phone: string | null;

  currentRole: string | null;

  province: string | null;

  city: string | null;

  yearsExperience: number | null;

  skills: string[] | null;

  salaryExpectation: number | null;

  availability: string | null;

  noticePeriod: string | null;

  willingToRelocate: boolean;

  status: AnnixOrbitTalentCandidateStatus;

  pipelineStage: OrbitPipelineStage;

  source: AnnixOrbitCandidateSource;

  notes: string | null;

  // Raw CV text + stored file (issue #337: CV upload used to parse-and-discard).
  cvText: string | null;

  cvFilePath: string | null;

  // Gemini embedding over the candidate's profile + CV text, refreshed in the
  // background whenever the profile changes (issue #337 embedding matching).
  embedding: number[] | null;

  consentToShare: boolean;

  consentGivenAt: string | null;

  consentSource: string | null;

  createdAt: Date;

  updatedAt: Date;
}
