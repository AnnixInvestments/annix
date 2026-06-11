import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import type { ExternalJob } from "../entities/external-job.entity";

export interface RecommendedMatchCountFilters {
  province?: string | null;
  city?: string | null;
  category?: string | null;
  minSalary?: number | null;
  search?: string | null;
  sourceIds?: number[] | null;
  // Effective country set the job must belong to (target-country gate, narrowed to
  // a single value when the Region dropdown is used).
  countries?: string[] | null;
}

export interface RecommendedFacetRow {
  country: string | null;
  canonicalProvince: string | null;
  canonicalCity: string | null;
  canonicalCategory: string | null;
  sourceId: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  title: string | null;
  company: string | null;
  locationArea: string | null;
  locationRaw: string | null;
}

export abstract class CandidateJobMatchRepository extends CrudRepository<CandidateJobMatch> {
  abstract findByCandidateAndJob(
    candidateId: number,
    externalJobId: number,
  ): Promise<CandidateJobMatch | null>;
  abstract recommendedJobsForCandidate(
    candidateId: number,
    includeDismissed: boolean,
    limit: number,
    filters?: RecommendedMatchCountFilters | null,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>>;
  abstract matchingCandidatesForJob(
    externalJobId: number,
    limit: number,
  ): Promise<Array<CandidateJobMatch & { candidate: Candidate }>>;
  abstract setDismissed(matchId: number, dismissed: boolean, reason?: string | null): Promise<void>;
  abstract findDismissedForCandidate(candidateId: number): Promise<CandidateJobMatch[]>;
  abstract deleteForCandidates(candidateIds: number[]): Promise<number>;
  abstract countActiveForCandidates(candidateIds: number[]): Promise<number>;
  abstract countRecommendedForCandidates(
    candidateIds: number[],
    filters: RecommendedMatchCountFilters | null,
  ): Promise<number>;
  abstract facetRowsForCandidates(candidateIds: number[]): Promise<RecommendedFacetRow[]>;
  abstract countActiveForCandidatesSince(candidateIds: number[], since: Date): Promise<number>;
  abstract weeklyDigestMatches(
    jobPostingIds: number[],
    since: Date,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob; candidate: Candidate }>>;
  abstract recentMatchesForCandidate(
    candidateId: number,
    since: Date,
    threshold: number,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>>;
}
