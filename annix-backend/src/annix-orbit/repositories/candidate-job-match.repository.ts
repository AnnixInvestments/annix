import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import type { ExternalJob } from "../entities/external-job.entity";

export abstract class CandidateJobMatchRepository extends CrudRepository<CandidateJobMatch> {
  abstract findByCandidateAndJob(
    candidateId: number,
    externalJobId: number,
  ): Promise<CandidateJobMatch | null>;
  abstract recommendedJobsForCandidate(
    candidateId: number,
    includeDismissed: boolean,
    limit: number,
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>>;
  abstract matchingCandidatesForJob(
    externalJobId: number,
    limit: number,
  ): Promise<Array<CandidateJobMatch & { candidate: Candidate }>>;
  abstract setDismissed(matchId: number, dismissed: boolean): Promise<void>;
  abstract deleteForCandidates(candidateIds: number[]): Promise<number>;
  abstract countActiveForCandidates(candidateIds: number[]): Promise<number>;
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
