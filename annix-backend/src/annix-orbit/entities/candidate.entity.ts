import type { WorkProfile } from "@annix/product-data/sa-market";
import { CandidateReference } from "./candidate-reference.entity";
import { JobPosting } from "./job-posting.entity";

export enum CandidateStatus {
  NEW = "new",
  SCREENING = "screening",
  REJECTED = "rejected",
  SHORTLISTED = "shortlisted",
  REFERENCE_CHECK = "reference_check",
  ACCEPTED = "accepted",
}

export interface ExtractedCvData {
  candidateName: string | null;
  email: string | null;
  phone: string | null;
  experienceYears: number | null;
  skills: string[];
  education: string[];
  certifications: string[];
  references: Array<{
    name: string;
    email: string;
    relationship: string | null;
  }>;
  summary: string | null;
  detectedLanguage: string | null;
  professionalRegistrations: string[];
  saQualifications: string[];
  location: string | null;
  // Nix-suggested market salary band for this candidate's qualifications +
  // experience + industry (ZAR / year). The seeker can override it on the Work
  // profile page; the matcher uses the override when present, else this.
  suggestedSalaryMin?: number | null;
  suggestedSalaryMax?: number | null;
  // Nix-detected seniority of the candidate, used for seniority-aware experience
  // matching against the job's inferred level.
  seniority?: CandidateSeniority | null;
}

export const CANDIDATE_SENIORITY_LEVELS = [
  "entry",
  "junior",
  "mid",
  "senior",
  "lead",
  "executive",
] as const;

export type CandidateSeniority = (typeof CANDIDATE_SENIORITY_LEVELS)[number];

export type DecisionSource = "automated" | "human";

export interface MatchAnalysis {
  overallScore: number;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: boolean;
  educationMatch: boolean;
  recommendation: "reject" | "review" | "shortlist";
  reasoning: string | null;
}

export class Candidate {
  id: number;

  email: string | null;

  name: string | null;

  cvFilePath: string | null;

  rawCvText: string | null;

  extractedData: ExtractedCvData | null;

  matchAnalysis: MatchAnalysis | null;

  matchScore: number | null;

  status: CandidateStatus;

  decisionSource: DecisionSource | null;

  sourceEmailId: string | null;

  beeLevel: number | null;

  popiaConsent: boolean;

  popiaConsentedAt: Date | null;

  lastActiveAt: Date | null;

  jobAlertsOptIn: boolean;

  rejectionSentAt: Date | null;

  isTestFixture: boolean;

  workProfile: WorkProfile | null;

  locationLat: number | null;

  locationLon: number | null;

  acceptanceSentAt: Date | null;

  jobPosting: JobPosting | null;

  jobPostingId: number | null;

  references: CandidateReference[];

  embedding: Buffer | null;

  embeddingTextHash: string | null;

  targetCategories: string[] | null;

  targetCountries: string[] | null;

  matchTier: string;

  // Perf #396 finding 2: precomputed "<category>|<country>" (+ "*|<country>")
  // keys derived from matchTier/targetCategories/targetCountries, so the
  // job→candidate match scan narrows to an indexed `$in` instead of scanning
  // every candidate embedding. Maintained via candidateMatchKeys on every write.
  matchKeys: string[] | null;

  trialTier: string | null;

  trialEndsAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
