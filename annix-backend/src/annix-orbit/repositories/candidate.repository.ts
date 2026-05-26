import { CrudRepository } from "../../lib/persistence/crud-repository";
import { Candidate } from "../entities/candidate.entity";

export interface CandidateAllForCompanyFilters {
  status?: string;
  jobPostingId?: number | null;
}

export interface CandidateEmbeddingCoverageRow {
  total: number;
  embedded: number;
}

export abstract class CandidateRepository extends CrudRepository<Candidate> {
  abstract findByJobPosting(jobPostingId: number, status?: string): Promise<Candidate[]>;
  abstract findByIdWithJobAndReferences(id: number): Promise<Candidate | null>;
  abstract findByIdWithJobPosting(id: number): Promise<Candidate | null>;
  abstract findByIdWithJobAndReferencesRelations(id: number): Promise<Candidate | null>;
  abstract findAllForCompany(
    companyId: number,
    filters?: CandidateAllForCompanyFilters,
  ): Promise<Candidate[]>;
  abstract topCandidates(companyId: number, limit: number): Promise<Candidate[]>;
  abstract candidatesForCompany(companyId: number): Promise<Candidate[]>;
  abstract candidatesMatchingTrades(tradeKeys: string[]): Promise<Candidate[]>;
  abstract candidatesMissingEmbedding(): Promise<Candidate[]>;
  abstract embeddingCoverage(): Promise<CandidateEmbeddingCoverageRow>;
  abstract listNonFixture(params: {
    search: string | null;
    skip: number;
    limit: number;
  }): Promise<[Candidate[], number]>;
  abstract findByEmail(email: string): Promise<Candidate[]>;
  abstract findByEmailWithJobPosting(email: string): Promise<Candidate[]>;
  abstract findByEmailWithJobAndReferences(email: string): Promise<Candidate[]>;
  abstract findInactiveBefore(cutoff: Date): Promise<Candidate[]>;
  abstract markRejectionSent(id: number, rejectionSentAt: Date): Promise<void>;
  abstract markAcceptanceSent(id: number, acceptanceSentAt: Date): Promise<void>;
  abstract deleteTestFixturesForJob(jobPostingId: number): Promise<number>;
  abstract setEmbeddingVector(id: number, embeddingLiteral: string): Promise<void>;
  abstract clearEmbedding(id: number): Promise<void>;
  abstract updateTradeProfile(id: number, tradeProfile: unknown): Promise<void>;
  abstract updateMatchTier(id: number, matchTier: string): Promise<void>;
  abstract grantMatchingConsent(ids: number[], consentedAt: Date): Promise<void>;
  abstract withdrawMatching(ids: number[]): Promise<void>;
  abstract candidatesWithEmbedding(): Promise<Candidate[]>;
  abstract jobAlertCandidates(): Promise<Candidate[]>;
  abstract countNewForJobsSince(jobPostingIds: number[], since: Date): Promise<number>;
  abstract countForCompanyByStatuses(
    companyId: number,
    statuses: string[] | null,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<number>;
  abstract matchAccuracyData(
    companyId: number,
  ): Promise<Array<{ matchScore: number | null; status: string }>>;
  abstract funnelExportCandidates(
    companyId: number,
    dateFrom: Date | null,
    dateTo: Date | null,
  ): Promise<Candidate[]>;
  abstract fairnessRows(
    jobPostingId: number,
    screeningStatuses: string[],
    windowSize: number,
  ): Promise<
    Array<{
      candidate_id: number;
      status: string;
      population_group: string;
      gender: string;
      disability_status: string;
      nationality_status: string;
    }>
  >;
}
