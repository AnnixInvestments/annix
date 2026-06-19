import { Candidate } from "./candidate.entity";
import { ExternalJob } from "./external-job.entity";

export interface MatchDetails {
  embeddingSimilarity: number;
  skillsOverlap: number;
  skillsMatched: string[];
  skillsMissing: string[];
  experienceMatch: number;
  locationMatch: number;
  salaryMatch?: number;
  salaryFitNote?: string | null;
  // Rendered on read from the numeric/structured fields — never persisted (M4).
  reasoning?: string;
  distanceKm?: number | null;
  outsideTradeRadius?: boolean;
  dismissPenalty?: number;
  fieldMatched?: boolean;
  roleMatched?: boolean;
}

export class CandidateJobMatch {
  id: number;

  candidate: Candidate;

  candidateId: number;

  externalJob: ExternalJob;

  externalJobId: number;

  similarityScore: number;

  structuredScore: number;

  overallScore: number;

  matchDetails: MatchDetails | null;

  dismissed: boolean;

  dismissReason: string | null;

  createdAt: Date;

  updatedAt: Date;
}
