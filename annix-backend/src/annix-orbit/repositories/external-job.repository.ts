import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ExternalJob } from "../entities/external-job.entity";
import type { EmbeddingSimilarityBatch } from "../lib/embedding-similarity";

export interface ExternalJobListOptions {
  country?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MarketCategoryRow {
  category: string;
  count: number;
}

export interface MarketLocationRow {
  location: string;
  count: number;
}

export interface MarketSalaryRow {
  category: string;
  averageSalaryMin: number;
  averageSalaryMax: number;
}

export interface MonthlyJobRow {
  month: string;
  count: number;
}

export interface VettingUpdate {
  acceptsZa: boolean | null;
  vettingNotes: string | null;
  vettedAt: Date;
}

export interface PendingCategoryJob {
  id: number;
  title: string;
  category: string | null;
  description: string | null;
}

export interface PerSourceJobCount {
  sourceId: number;
  count: number;
}

export interface EmbeddingCoverageRow {
  total: number;
  embedded: number;
}

export interface DelistReportRow {
  id: number;
  title: string;
  company: string | null;
  locationRaw: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  sourceUrl: string | null;
  sourceProvider: string | null;
  delistReportedAt: Date | null;
  delistReportedBy: string | null;
}

export interface DuplicateJobSide {
  id: number;
  title: string;
  company: string | null;
  location: string | null;
  source: string;
  createdAt: string | null;
}

export interface DuplicateJobPair {
  score: number;
  crossSource: boolean;
  a: DuplicateJobSide;
  b: DuplicateJobSide;
}

export interface DedupCandidateRow {
  id: number;
  title: string;
  locationArea: string;
  company: string;
  provider: string;
  descriptionLength: number;
  createdAt: Date | null;
}

export abstract class ExternalJobRepository extends CrudRepository<ExternalJob> {
  abstract findByIdWithSource(id: number): Promise<ExternalJob | null>;
  abstract externalJobsForCompany(
    companyId: number,
    options: ExternalJobListOptions,
  ): Promise<{ jobs: ExternalJob[]; total: number }>;
  abstract platformGlobalExternalJobs(
    options: ExternalJobListOptions,
  ): Promise<{ jobs: ExternalJob[]; total: number }>;
  abstract publicExternalJobs(options: ExternalJobListOptions): Promise<ExternalJob[]>;
  abstract jobsWithEmbedding(
    categoryPool: string[] | null,
    countries?: string[] | null,
  ): Promise<ExternalJob[]>;
  abstract jobEmbeddingBatches(
    categoryPool: string[] | null,
    countries: string[] | null,
    batchSize: number,
  ): AsyncIterable<EmbeddingSimilarityBatch>;
  abstract findPendingVetting(limit: number): Promise<ExternalJob[]>;
  abstract updateVetting(id: number, update: VettingUpdate): Promise<void>;
  abstract findByExternalIds(externalIds: string[], sourceId: number): Promise<ExternalJob[]>;
  abstract jobsMissingEmbedding(): Promise<ExternalJob[]>;
  abstract embeddingCoverage(): Promise<EmbeddingCoverageRow>;
  abstract canonicalCategoryCoverage(): Promise<{ total: number; classified: number }>;
  abstract countForSourceSince(sourceId: number, since: Date): Promise<number>;
  abstract countForSources(sourceIds: number[]): Promise<number>;
  abstract countForSourcesSince(sourceIds: number[], since: Date): Promise<number>;
  abstract setEmbeddingVector(id: number, values: number[]): Promise<void>;
  abstract updateLocation(id: number, lat: number, lon: number): Promise<void>;
  abstract findDuplicateCanonicalJob(
    title: string,
    sourceId: number,
    country: string,
    normalisedLocation: string,
    normalisedCompany: string,
  ): Promise<ExternalJob | null>;
  abstract coldStartJobs(locationTokens: string[], limit: number): Promise<ExternalJob[]>;
  abstract coldStartFallbackJobs(limit: number): Promise<ExternalJob[]>;
  abstract salaryBenchmarks(sourceIds: number[]): Promise<
    Array<{
      category: string;
      avgSalary: string | null;
      minSalary: string | null;
      maxSalary: string | null;
      sampleSize: string;
    }>
  >;
  abstract demandCounts(
    sourceIds: number[],
    start: Date,
    end: Date | null,
  ): Promise<Array<{ category: string; count: string }>>;
  abstract locationDemand(
    sourceIds: number[],
  ): Promise<Array<{ location: string; jobCount: string; avgSalary: string | null }>>;
  abstract topExtractedSkillRows(sourceIds: number[]): Promise<Array<{ skills: unknown }>>;
  abstract activeJobCount(sourceIds: number[]): Promise<number>;
  abstract marketByCategory(companyId: number): Promise<MarketCategoryRow[]>;
  abstract marketByLocation(companyId: number): Promise<MarketLocationRow[]>;
  abstract marketSalaryByCategory(companyId: number): Promise<MarketSalaryRow[]>;
  abstract marketMonthlyJobs(companyId: number, since: Date): Promise<MonthlyJobRow[]>;
  abstract marketJobsWithSkills(companyId: number): Promise<ExternalJob[]>;
  abstract findPendingCanonicalCategory(limit: number): Promise<PendingCategoryJob[]>;
  abstract updateCanonicalCategory(id: number, canonicalCategory: string | null): Promise<void>;
  abstract findByIds(ids: number[]): Promise<ExternalJob[]>;
  abstract perSourceJobCounts(sourceIds: number[]): Promise<PerSourceJobCount[]>;
  abstract findDuplicateJobPairs(limit: number): Promise<DuplicateJobPair[]>;
  abstract dedupCandidateRows(): Promise<DedupCandidateRow[]>;
  abstract deleteById(id: number): Promise<void>;
  abstract deleteByIds(ids: number[]): Promise<void>;
  abstract stampLastSeenByExternalIds(
    sourceId: number,
    externalIds: string[],
    seenAt: Date,
  ): Promise<void>;
  abstract stampLastSeenByIds(ids: number[], seenAt: Date): Promise<void>;
  abstract expireStaleJobs(): Promise<number>;
  abstract idsLastSeenBefore(cutoff: Date): Promise<number[]>;
  abstract reportDelist(id: number, reportedBy: string | null, reportedAt: Date): Promise<void>;
  abstract confirmDelist(id: number, delistedAt: Date): Promise<void>;
  abstract rejectDelist(id: number): Promise<void>;
  abstract pendingDelistReports(): Promise<DelistReportRow[]>;
  abstract countPendingDelistReports(): Promise<number>;
}
