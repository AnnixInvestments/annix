import {
  DEFAULT_MATCH_TIER,
  expandWithAdjacentCategories,
  isJobCategoryKey,
  isMatchTier,
  type JobCategoryKey,
  type MatchTier,
} from "@annix/product-data/sa-market";
import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { chunk } from "es-toolkit/compat";
import {
  CANDIDATE_SENIORITY_LEVELS,
  Candidate,
  type CandidateSeniority,
} from "../entities/candidate.entity";
import { CandidateJobMatch, MatchDetails } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";
import {
  cosineSimilarity,
  parseEmbedding,
  rankEmbeddingBatches,
} from "../lib/embedding-similarity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../repositories/candidate-job-match.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";
import { CvNotificationService } from "./cv-notification.service";
import { haversineKm } from "./geocode.service";

// The five base-score weights. Live scoring uses DEFAULT_WEIGHTS; alternative
// profiles exist only for A/B inspection via the explain harness — they do NOT
// change production matching. Each profile should sum to 1.0.
export interface MatchWeights {
  embedding: number;
  skills: number;
  experience: number;
  location: number;
  salary: number;
}

export const DEFAULT_WEIGHTS: MatchWeights = {
  embedding: 0.45,
  skills: 0.22,
  experience: 0.15,
  location: 0.08,
  salary: 0.1,
};

// Experimental profiles to compare against DEFAULT_WEIGHTS. Tune freely.
export const WEIGHT_PROFILES: Record<string, MatchWeights> = {
  default: DEFAULT_WEIGHTS,
  // Lean less on the embedding, more on concrete skills/role evidence.
  "skills-forward": { embedding: 0.35, skills: 0.3, experience: 0.15, location: 0.1, salary: 0.1 },
  // A middle ground between the two.
  balanced: { embedding: 0.4, skills: 0.25, experience: 0.15, location: 0.1, salary: 0.1 },
};

export function weightProfile(key: string): MatchWeights {
  const found = WEIGHT_PROFILES[key];
  return found ? found : DEFAULT_WEIGHTS;
}

const WORK_PROFILE_BOOST_CAP = 0.1;
const FIELD_WEIGHT_WITHIN_BOOST = 0.6;
const ROLE_WEIGHT_WITHIN_BOOST = 0.4;
const ADJACENT_FIELD_SCORE = 0.5;
const OUTSIDE_RADIUS_PENALTY = 0.4;

const TOP_MATCHES_LIMIT = 20;
// Seekers default to South African jobs; they opt into other countries (e.g. "gb")
// via their profile. The match pool is scoped to these so UK jobs only reach
// seekers who asked for them.
const DEFAULT_TARGET_COUNTRIES = ["za"];

export function targetCountriesOf(countries: string[] | null | undefined): string[] {
  return countries && countries.length > 0 ? countries : DEFAULT_TARGET_COUNTRIES;
}
// Ceiling for how many matches the DISPLAY/feed window considers for a tier whose
// maxJobResults is null ("unlimited", e.g. Trailblazer). The feed only ever shows
// the top 100, so this stays modest.
const UNLIMITED_MATCH_CEILING = 150;
// How many matches the unlimited tier STORES per run. Set high enough to cover the
// whole live job pool so a single candidate-side run ranks + persists every job
// against the CV — identical to what the per-job ingestion matching produces over
// time, but independent of whether jobs were ingested before or after the CV.
const UNLIMITED_STORAGE_CEILING = 25000;
// Score + persist matches in bounded batches so a full-pool run doesn't open
// thousands of concurrent writes against the database at once.
const MATCH_PERSIST_CHUNK = 200;
const EMBEDDING_SCAN_BATCH_SIZE = 1000;

// "Not for me" learning: down-weight a job whose embedding is very close to a
// job the seeker already dismissed. Gentle + tunable — only jobs above the
// similarity threshold are nudged down, and never by more than the max, so the
// feed is refined rather than starved.
const DISMISS_SIM_THRESHOLD = 0.85;
const MAX_DISMISS_PENALTY = 0.15;
const DISMISS_PENALTY_SCALE = 1.0;

const CATEGORY_BOOST_CAP_BY_TIER: Record<MatchTier, number> = {
  soft: 0.06,
  medium: 0.1,
  hard: 0.12,
};
const ADJACENT_CATEGORY_BOOST_FACTOR = 0.5;

interface CategoryNarrowing {
  pool: string[] | null;
  targetSet: Set<string>;
  adjacentSet: Set<string>;
  boostCap: number;
}

export const STRETCH_RESERVED_SLOTS = 3;
export const STRETCH_SCORE_BAND_MIN = 0.6;
export const STRETCH_SCORE_BAND_MAX = 0.79;

// Experience band score when the CV's years-of-experience couldn't be read.
// Neutral rather than punishing — a missing number shouldn't look like "no
// experience" (raised from 0.3 → 0.5, ref matching-rules review).
const UNKNOWN_EXPERIENCE_SCORE = 0.5;

// Travel-radius penalty is graded, not a cliff: no penalty at/inside the radius,
// tapering to OUTSIDE_RADIUS_PENALTY (the old flat multiplier) at TRAVEL_FULL_
// PENALTY_FACTOR × the radius. A job 1 km past the radius is barely dinged.
const TRAVEL_FULL_PENALTY_FACTOR = 2;

// Common skill aliases → canonical form, so exact-equivalent skills written
// differently still match. Kept small and general; the embedding already handles
// fuzzy semantic overlap, this only collapses aliases the token matcher misses.
const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  reactjs: "react",
  "react.js": "react",
  nodejs: "node",
  "node.js": "node",
  postgres: "postgresql",
  postgre: "postgresql",
  k8s: "kubernetes",
  golang: "go",
  csharp: "c#",
  "c sharp": "c#",
  dotnet: ".net",
  "dot net": ".net",
  "ms office": "microsoft office",
  "ms excel": "excel",
  "ms word": "word",
};

function normaliseSkill(skill: string): string {
  const lowered = skill.toLowerCase().trim();
  // Keep + # . (C++, C#, .net); collapse other punctuation to spaces.
  const cleaned = lowered
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const alias = SKILL_ALIASES[cleaned];
  return alias ? alias : cleaned;
}

function skillTokens(normalised: string): string[] {
  return normalised.split(" ").filter((token) => token.length >= 2 || /[+#]/.test(token));
}

// Two skills match if they normalise to the same string, or every significant
// token of the shorter phrase appears as a WHOLE token in the longer one. This
// replaces naive substring matching, so "java" no longer matches "javascript"
// and "c" no longer matches "civil"/"c++".
function skillsMatch(candidateSkill: string, jobSkill: string): boolean {
  const candidate = normaliseSkill(candidateSkill);
  const job = normaliseSkill(jobSkill);
  if (candidate === job) {
    return true;
  }
  const candidateTokens = skillTokens(candidate);
  const jobTokens = skillTokens(job);
  if (candidateTokens.length === 0 || jobTokens.length === 0) {
    return false;
  }
  const shorter = candidateTokens.length <= jobTokens.length ? candidateTokens : jobTokens;
  const longer = candidateTokens.length <= jobTokens.length ? jobTokens : candidateTokens;
  const longerSet = new Set(longer);
  return shorter.every((token) => longerSet.has(token));
}
const RECOMMENDED_FETCH_WINDOW = 200;

export interface RecommendedJobFilters {
  // Multi-select: empty/absent arrays mean "no filter"; otherwise match ANY value.
  provinces?: string[] | null;
  cities?: string[] | null;
  category?: string | null;
  minSalary?: number | null;
  search?: string | null;
  providers?: string[] | null;
  sourceIds?: number[] | null;
  // The seeker's target countries (hard gate, never user-removable) and an
  // optional single-country narrowing from the Region dropdown.
  countries?: string[] | null;
  region?: string | null;
}

function roleTokens(role: string): string[] {
  return role
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function roleAppearsInText(role: string, haystack: string): boolean {
  const tokens = roleTokens(role);
  if (tokens.length === 0) return false;
  const matched = tokens.filter((token) => haystack.includes(token));
  return matched.length >= Math.ceil(tokens.length / 2);
}

// Candidate years → base experience band (independent of the job).
function experienceBandScore(years: number | null | undefined): number {
  if (!years) return UNKNOWN_EXPERIENCE_SCORE; // 0 / missing → neutral, not zero-experience
  if (years >= 5) return 1.0;
  if (years >= 3) return 0.8;
  if (years >= 1) return 0.5;
  return 0.2;
}

// Infer a job's seniority from its title + description. Highest signal wins.
export function inferJobSeniority(job: ExternalJob): CandidateSeniority | null {
  const text = `${job.title ?? ""} ${job.description ?? ""}`.toLowerCase();
  if (
    /(chief|c-level|\bceo\b|\bcfo\b|\bcto\b|\bcoo\b|executive|vice president|\bvp\b|director|head of)/.test(
      text,
    )
  ) {
    return "executive";
  }
  if (/(principal|team lead|\blead\b|architect)/.test(text)) return "lead";
  if (/(senior|\bsnr\b|\bsr\b)/.test(text)) return "senior";
  if (/(mid[- ]?level|intermediate)/.test(text)) return "mid";
  if (
    /(entry[- ]?level|trainee|intern|internship|apprentice|no experience|fresh graduate)/.test(text)
  ) {
    return "entry";
  }
  if (/(junior|\bjnr\b|graduate|\bgrad\b)/.test(text)) return "junior";
  return null;
}

@Injectable()
export class CandidateJobMatchingService {
  private readonly logger = new Logger(CandidateJobMatchingService.name);

  constructor(
    private readonly matchRepo: CandidateJobMatchRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly externalJobRepo: ExternalJobRepository,
    private readonly tierCapabilityRepo: OrbitTierCapabilityRepository,
    @Inject(forwardRef(() => CvNotificationService))
    private readonly notificationService: CvNotificationService,
  ) {}

  // How many matches a seeker's tier allows. Driven by the tier's
  // maxJobResults (Explorer 20, Pathfinder 50, Trailblazer null=unlimited →
  // capped to UNLIMITED_MATCH_CEILING). Falls back to TOP_MATCHES_LIMIT when a
  // tier has no capability row.
  private async effectiveMatchLimit(matchTier: string): Promise<number> {
    const capability = await this.tierCapabilityRepo.findByTier(matchTier);
    if (!capability) {
      return TOP_MATCHES_LIMIT;
    }
    const maxJobResults = capability.maxJobResults;
    return maxJobResults == null ? UNLIMITED_MATCH_CEILING : maxJobResults;
  }

  // How many matches to generate + persist for a candidate. The unlimited tier
  // stores far more than the feed window so the true match count reflects the
  // whole relevant pool, not just the first page.
  private async storageMatchLimit(matchTier: string): Promise<number> {
    const capability = await this.tierCapabilityRepo.findByTier(matchTier);
    if (!capability) {
      return TOP_MATCHES_LIMIT;
    }
    const maxJobResults = capability.maxJobResults;
    return maxJobResults == null ? UNLIMITED_STORAGE_CEILING : maxJobResults;
  }

  async matchCandidateToJobs(
    candidateId: number,
    options: { storageLimit?: number } = {},
  ): Promise<CandidateJobMatch[]> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) {
      return [];
    } else {
      const narrowing = this.resolveCategoryNarrowing(candidate);
      const tierStorageLimit = await this.storageMatchLimit(candidate.matchTier);
      const matchLimit =
        options.storageLimit == null
          ? tierStorageLimit
          : Math.min(tierStorageLimit, options.storageLimit);
      const dismissedVectors = await this.loadDismissedJobVectors(candidateId);
      const similarJobs = await this.findSimilarJobsByEmbedding(
        candidate,
        matchLimit,
        narrowing.pool,
        targetCountriesOf(candidate.targetCountries),
      );

      const matches: CandidateJobMatch[] = [];
      for (const batch of chunk(similarJobs, MATCH_PERSIST_CHUNK)) {
        const jobIds = batch.map((row) => row.jobId);
        const jobs = await this.externalJobRepo.findByIds(jobIds);
        const jobsById = new Map(jobs.map((job) => [job.id, job]));
        const embeddingsById =
          dismissedVectors.length > 0
            ? await this.externalJobRepo.jobEmbeddings(jobIds)
            : new Map<number, Buffer>();
        const batchResults = await Promise.all(
          batch.map(async (row) => {
            const job = jobsById.get(row.jobId);
            if (!job) {
              return null;
            }
            const categoryBoost = this.categoryBoostFor(job, narrowing);
            return this.scoreAndSaveMatch(
              candidate,
              job,
              row.similarity,
              candidateId,
              job.id,
              categoryBoost,
              dismissedVectors,
              embeddingsById.get(job.id) ?? null,
            );
          }),
        );
        for (const result of batchResults) {
          if (result !== null) matches.push(result);
        }
      }

      this.logger.log(`Matched candidate ${candidateId} to ${matches.length} jobs`);

      this.notificationService
        .notifyRecruitersOfHighMatch(
          candidateId,
          matches.map((m) => ({ externalJobId: m.externalJobId, overallScore: m.overallScore })),
        )
        .catch((err) => {
          this.logger.warn(
            `Failed to send match alerts for candidate ${candidateId}: ${err.message}`,
          );
        });

      return matches;
    }
  }

  async matchJobToCandidates(externalJobId: number): Promise<CandidateJobMatch[]> {
    const job = await this.externalJobRepo.findById(externalJobId);
    if (!job) {
      return [];
    } else {
      const similarCandidates = await this.findSimilarCandidatesByEmbedding(job, TOP_MATCHES_LIMIT);

      const results = await Promise.all(
        similarCandidates.map(async (row) => {
          const candidate = await this.candidateRepo.findById(row.candidateId);
          if (!candidate) {
            return null;
          } else {
            return this.scoreAndSaveMatch(
              candidate,
              job,
              row.similarity,
              candidate.id,
              externalJobId,
            );
          }
        }),
      );

      const matches = results.filter((m): m is CandidateJobMatch => m !== null);

      this.logger.log(`Matched job ${externalJobId} to ${matches.length} candidates`);
      return matches;
    }
  }

  async recommendedJobsForCandidate(
    candidateId: number,
    options: {
      includeDismissed?: boolean;
      filters?: RecommendedJobFilters | null;
      tierOverride?: string | null;
    } = {},
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    const candidate = await this.candidateRepo.findById(candidateId);
    // The seeker's chosen plan (selectedTier) is the source of truth for how many
    // matches they may see. The candidate's stored matchTier can lag behind a plan
    // change, so an explicit override wins; only then fall back to the stored tier.
    const tier = options.tierOverride ?? candidate?.matchTier ?? DEFAULT_MATCH_TIER;
    const limit = await this.effectiveMatchLimit(tier);

    // Fetch at least the tier's full allowance (a higher tier than the default
    // window must not be silently truncated), with the window as a floor so lower
    // tiers still get a diversity pool larger than their display limit. Filters are
    // applied in the DB query so the displayed set is the top-ranked of the FULL
    // filtered pool — never the filtered subset of a score-capped window, which
    // would drop matches that the headline count includes.
    const fetchWindow = Math.max(RECOMMENDED_FETCH_WINDOW, limit);
    const allMatches = await this.matchRepo.recommendedJobsForCandidate(
      candidateId,
      options.includeDismissed ?? false,
      fetchWindow,
      options.filters ?? null,
    );

    return this.applyStretchMatchDiversity(allMatches, limit);
  }

  applyStretchMatchDiversity<T extends Pick<CandidateJobMatch, "overallScore">>(
    sortedMatches: T[],
    limit: number = TOP_MATCHES_LIMIT,
  ): T[] {
    if (sortedMatches.length <= limit) {
      return sortedMatches;
    }

    const reserved = STRETCH_RESERVED_SLOTS;
    const topPriorityCount = limit - reserved;
    const topPriority = sortedMatches.slice(0, topPriorityCount);
    const remaining = sortedMatches.slice(topPriorityCount);

    const stretchPool: T[] = [];
    const fallbackPool: T[] = [];
    for (const candidate of remaining) {
      const score = candidate.overallScore;
      if (
        stretchPool.length < reserved &&
        score >= STRETCH_SCORE_BAND_MIN &&
        score <= STRETCH_SCORE_BAND_MAX
      ) {
        stretchPool.push(candidate);
      } else {
        fallbackPool.push(candidate);
      }
    }

    const fillerCount = reserved - stretchPool.length;
    const fillers = fillerCount > 0 ? fallbackPool.slice(0, fillerCount) : [];

    const combined = [...topPriority, ...stretchPool, ...fillers];
    return combined.slice(0, limit).sort((a, b) => b.overallScore - a.overallScore);
  }

  async matchingCandidatesForJob(
    externalJobId: number,
  ): Promise<Array<CandidateJobMatch & { candidate: Candidate }>> {
    return this.matchRepo.matchingCandidatesForJob(externalJobId, TOP_MATCHES_LIMIT);
  }

  async dismissMatch(matchId: number, reason?: string | null): Promise<void> {
    await this.matchRepo.setDismissed(matchId, true, reason ?? null);
  }

  resolveCategoryNarrowing(candidate: Candidate): CategoryNarrowing {
    const tier: MatchTier = isMatchTier(candidate.matchTier)
      ? candidate.matchTier
      : DEFAULT_MATCH_TIER;
    const targets = (candidate.targetCategories ?? []).filter((key): key is JobCategoryKey =>
      isJobCategoryKey(key),
    );

    if (targets.length === 0) {
      return { pool: null, targetSet: new Set(), adjacentSet: new Set(), boostCap: 0 };
    }

    const adjacent = expandWithAdjacentCategories(targets);
    const pool = tier === "hard" ? targets : tier === "medium" ? adjacent : null;

    return {
      pool,
      targetSet: new Set<string>(targets),
      adjacentSet: new Set<string>(adjacent),
      boostCap: CATEGORY_BOOST_CAP_BY_TIER[tier],
    };
  }

  private categoryBoostFor(job: ExternalJob, narrowing: CategoryNarrowing): number {
    const category = job.canonicalCategory;
    if (!category || narrowing.targetSet.size === 0) return 0;
    if (narrowing.targetSet.has(category)) return narrowing.boostCap;
    if (narrowing.adjacentSet.has(category)) {
      return narrowing.boostCap * ADJACENT_CATEGORY_BOOST_FACTOR;
    }
    return 0;
  }

  private async findSimilarJobsByEmbedding(
    candidate: Candidate,
    limit: number,
    categoryPool: string[] | null = null,
    countries: string[] | null = null,
  ): Promise<Array<{ jobId: number; similarity: number }>> {
    const candidateVector = parseEmbedding(candidate.embedding);
    if (candidateVector === null) {
      return [];
    }

    const ranked = await rankEmbeddingBatches(
      candidateVector,
      this.externalJobRepo.jobEmbeddingBatches(categoryPool, countries, EMBEDDING_SCAN_BATCH_SIZE),
      limit,
    );
    return ranked.map((row) => ({ jobId: row.id, similarity: row.similarity }));
  }

  private async findSimilarCandidatesByEmbedding(
    job: ExternalJob,
    limit: number,
  ): Promise<Array<{ candidateId: number; similarity: number }>> {
    const jobEmbedding = await this.externalJobRepo.jobEmbedding(job.id);
    const jobVector = parseEmbedding(jobEmbedding);
    if (jobVector === null) {
      return [];
    }

    const ranked = await rankEmbeddingBatches(
      jobVector,
      this.candidateRepo.candidateEmbeddingBatches(EMBEDDING_SCAN_BATCH_SIZE),
      limit,
    );
    return ranked.map((row) => ({ candidateId: row.id, similarity: row.similarity }));
  }

  private calculateSkillsOverlap(
    candidate: Candidate,
    job: ExternalJob,
  ): { score: number; matched: string[]; missing: string[] } {
    const candidateSkills = candidate.extractedData?.skills ?? [];
    const jobSkills = job.extractedSkills;

    if (jobSkills.length === 0) {
      return { score: candidateSkills.length > 0 ? 0.5 : 0, matched: [], missing: [] };
    }
    const matched = jobSkills.filter((js) => candidateSkills.some((cs) => skillsMatch(cs, js)));
    const missing = jobSkills.filter((js) => !candidateSkills.some((cs) => skillsMatch(cs, js)));

    return {
      score: matched.length / jobSkills.length,
      matched,
      missing,
    };
  }

  calculateWorkProfileBoost(
    candidate: Candidate,
    job: ExternalJob,
  ): {
    score: number | null;
    fieldMatched: boolean;
    roleMatched: boolean;
  } {
    const profile = candidate.workProfile;
    if (!profile || profile.shared.fields.length === 0) {
      return { score: null, fieldMatched: false, roleMatched: false };
    }
    const fields = profile.shared.fields;
    const jobCategory = isJobCategoryKey(job.canonicalCategory) ? job.canonicalCategory : null;

    let fieldScore = 0;
    let fieldMatched = false;
    if (jobCategory !== null) {
      if (fields.includes(jobCategory)) {
        fieldScore = 1;
        fieldMatched = true;
      } else if (expandWithAdjacentCategories(fields).includes(jobCategory)) {
        fieldScore = ADJACENT_FIELD_SCORE;
        fieldMatched = true;
      }
    }

    const role = profile.shared.primaryRole;
    const haystack = `${job.title ?? ""}\n${job.description ?? ""}`.toLowerCase();
    const roleMatched = role !== null && role.length > 0 && roleAppearsInText(role, haystack);
    const roleScore = roleMatched ? 1 : 0;

    const score = fieldScore * FIELD_WEIGHT_WITHIN_BOOST + roleScore * ROLE_WEIGHT_WITHIN_BOOST;

    return { score, fieldMatched, roleMatched };
  }

  private async loadDismissedJobVectors(candidateId: number): Promise<number[][]> {
    const dismissed = await this.matchRepo.findDismissedForCandidate(candidateId);
    if (dismissed.length === 0) {
      return [];
    }
    const embeddings = await this.externalJobRepo.jobEmbeddings(
      dismissed.map((match) => match.externalJobId),
    );
    return Array.from(embeddings.values())
      .map((embedding) => parseEmbedding(embedding))
      .filter((vector): vector is number[] => vector !== null);
  }

  private dismissPenaltyFor(jobEmbedding: Buffer | null, dismissedVectors: number[][]): number {
    if (dismissedVectors.length === 0) {
      return 0;
    }
    const jobVector = parseEmbedding(jobEmbedding);
    if (jobVector === null) {
      return 0;
    }
    let maxSimilarity = 0;
    for (const dismissedVector of dismissedVectors) {
      const similarity = cosineSimilarity(jobVector, dismissedVector);
      if (similarity !== null && similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }
    if (maxSimilarity <= DISMISS_SIM_THRESHOLD) {
      return 0;
    }
    return Math.min(
      MAX_DISMISS_PENALTY,
      (maxSimilarity - DISMISS_SIM_THRESHOLD) * DISMISS_PENALTY_SCALE,
    );
  }

  // Pure scoring — every component, the weighted combine, boosts and penalties —
  // with NO persistence. Shared by the live matcher and the read-only explain
  // harness so they can never drift.
  computeMatch(
    candidate: Candidate,
    job: ExternalJob,
    embeddingSimilarity: number,
    categoryBoost: number,
    dismissedVectors: number[][],
    jobEmbedding: Buffer | null = null,
    weights: MatchWeights = DEFAULT_WEIGHTS,
  ): {
    similarityScore: number;
    structuredScore: number;
    overallScore: number;
    matchDetails: MatchDetails;
  } {
    const skillsResult = this.calculateSkillsOverlap(candidate, job);
    const experienceMatch = this.calculateExperienceMatch(candidate, job);
    const locationMatch = this.calculateLocationMatch(candidate, job);
    const salaryResult = this.calculateSalaryMatch(candidate, job);
    const workBoost = this.calculateWorkProfileBoost(candidate, job);
    const distanceKm = this.calculateDistance(candidate, job);
    const outsideRadius = this.isOutsideTravelRadius(candidate, job);

    const baseScore =
      embeddingSimilarity * weights.embedding +
      skillsResult.score * weights.skills +
      experienceMatch * weights.experience +
      locationMatch * weights.location +
      salaryResult.score * weights.salary;

    const withWorkBoost =
      workBoost.score === null
        ? baseScore
        : Math.min(1, baseScore + workBoost.score * WORK_PROFILE_BOOST_CAP);
    const withBoost = Math.min(1, withWorkBoost + categoryBoost);
    const dismissPenalty = this.dismissPenaltyFor(jobEmbedding, dismissedVectors);
    const withDismissPenalty = Math.max(0, withBoost - dismissPenalty);
    const overallScore = withDismissPenalty * this.travelRadiusMultiplier(candidate, job);

    const matchDetails: MatchDetails = {
      embeddingSimilarity,
      skillsOverlap: skillsResult.score,
      skillsMatched: skillsResult.matched,
      skillsMissing: skillsResult.missing,
      experienceMatch,
      locationMatch,
      salaryMatch: salaryResult.score,
      salaryFitNote: salaryResult.note,
      distanceKm: distanceKm === null ? null : Math.round(distanceKm),
      outsideTradeRadius: outsideRadius,
      dismissPenalty,
      reasoning: this.buildReasoning(
        embeddingSimilarity,
        skillsResult,
        experienceMatch,
        locationMatch,
        salaryResult.note,
        job,
        workBoost,
        distanceKm,
        outsideRadius,
      ),
    };

    const nonEmbedding = 1 - weights.embedding;
    const structuredScore =
      skillsResult.score * (weights.skills / nonEmbedding) +
      experienceMatch * (weights.experience / nonEmbedding) +
      locationMatch * (weights.location / nonEmbedding) +
      salaryResult.score * (weights.salary / nonEmbedding);

    return { similarityScore: embeddingSimilarity, structuredScore, overallScore, matchDetails };
  }

  private async scoreAndSaveMatch(
    candidate: Candidate,
    job: ExternalJob,
    embeddingSimilarity: number,
    candidateId: number,
    externalJobId: number,
    categoryBoost = 0,
    dismissedVectors: number[][] = [],
    jobEmbedding: Buffer | null = null,
  ): Promise<CandidateJobMatch> {
    const scored = this.computeMatch(
      candidate,
      job,
      embeddingSimilarity,
      categoryBoost,
      dismissedVectors,
      jobEmbedding,
    );
    return this.matchRepo.upsertScoredMatch(candidateId, externalJobId, {
      similarityScore: scored.similarityScore,
      structuredScore: scored.structuredScore,
      overallScore: scored.overallScore,
      matchDetails: scored.matchDetails,
    });
  }

  // Read-only diagnostic: score a candidate's top embedding-ranked jobs and
  // return the full per-component breakdown WITHOUT persisting anything. Drives
  // scripts/match-explain.ts so the matching rules can be inspected on live data.
  async explainCandidateMatches(
    candidateId: number,
    limit = 15,
    weights: MatchWeights = DEFAULT_WEIGHTS,
  ): Promise<
    Array<{
      job: ExternalJob;
      similarityScore: number;
      structuredScore: number;
      overallScore: number;
      matchDetails: MatchDetails;
    }>
  > {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) {
      return [];
    }
    const narrowing = this.resolveCategoryNarrowing(candidate);
    const dismissedVectors = await this.loadDismissedJobVectors(candidateId);
    const similarJobs = await this.findSimilarJobsByEmbedding(
      candidate,
      limit,
      narrowing.pool,
      targetCountriesOf(candidate.targetCountries),
    );
    const jobIds = similarJobs.map((row) => row.jobId);
    const jobs = await this.externalJobRepo.findByIds(jobIds);
    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    const embeddingsById =
      dismissedVectors.length > 0
        ? await this.externalJobRepo.jobEmbeddings(jobIds)
        : new Map<number, Buffer>();
    return similarJobs
      .map((row) => {
        const job = jobsById.get(row.jobId);
        if (!job) {
          return null;
        }
        const categoryBoost = this.categoryBoostFor(job, narrowing);
        const scored = this.computeMatch(
          candidate,
          job,
          row.similarity,
          categoryBoost,
          dismissedVectors,
          embeddingsById.get(job.id) ?? null,
          weights,
        );
        return { job, ...scored };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  private calculateExperienceMatch(candidate: Candidate, job: ExternalJob): number {
    const base = experienceBandScore(candidate.extractedData?.experienceYears);
    const candidateSeniority = candidate.extractedData?.seniority ?? null;
    const jobSeniority = inferJobSeniority(job);
    // Only adjust when we have a seniority signal on both sides; otherwise the
    // candidate-years band stands on its own (backward compatible).
    if (candidateSeniority === null || jobSeniority === null) {
      return base;
    }
    const gap = Math.abs(
      CANDIDATE_SENIORITY_LEVELS.indexOf(candidateSeniority) -
        CANDIDATE_SENIORITY_LEVELS.indexOf(jobSeniority),
    );
    const alignment = gap === 0 ? 1 : gap === 1 ? 0.85 : 0.7;
    return Number((base * alignment).toFixed(6));
  }

  // The salary band the matcher should use for this candidate: the user override
  // (workProfile.expectedSalaryMin) when set, else Nix's CV-derived suggestion.
  private effectiveSalaryFloor(candidate: Candidate): number | null {
    const override = candidate.workProfile?.shared.expectedSalaryMin;
    if (override != null && Number(override) > 0) return Number(override);
    const suggested = candidate.extractedData?.suggestedSalaryMin;
    return suggested != null && Number(suggested) > 0 ? Number(suggested) : null;
  }

  // The seeker's EXPLICIT monthly salary minimum — only when they typed it into
  // their work profile, NOT Nix's CV-derived guess. Drives the hard "only show me
  // roles that pay at least this" filter.
  private explicitMonthlySalaryFloor(candidate: Candidate): number | null {
    const override = candidate.workProfile?.shared.expectedSalaryMin;
    return override != null && Number(override) > 0 ? Number(override) : null;
  }

  // True when the seeker set a monthly salary floor AND the job has pay data that
  // falls below it (compared on the job's normalised monthly figure). Jobs with no
  // pay data are never excluded — we can't judge them.
  isBelowSalaryFloor(candidate: Candidate, job: ExternalJob): boolean {
    const floor = this.explicitMonthlySalaryFloor(candidate);
    if (floor === null) return false;
    const rawTop = job.salaryMonthlyMax ?? job.salaryMonthlyMin;
    if (rawTop == null) return false;
    return Number(rawTop) < floor;
  }

  // "Meets-or-beats my floor": a job paying at/above the candidate's minimum
  // expectation scores 1.0; below it scores down in proportion to the shortfall.
  // Neutral (0.5, no note) when either side has no salary data.
  private calculateSalaryMatch(
    candidate: Candidate,
    job: ExternalJob,
  ): { score: number; note: string | null } {
    const floor = this.effectiveSalaryFloor(candidate);
    const rawTop = job.salaryMax ?? job.salaryMin;
    const jobTop = rawTop != null ? Number(rawTop) : null;
    if (floor === null || jobTop === null || jobTop <= 0) {
      return { score: 0.5, note: null };
    }
    if (jobTop >= floor) {
      return { score: 1, note: "Pay meets or beats your expectation" };
    }
    const ratio = Math.max(0, Math.min(1, jobTop / floor));
    return { score: 0.2 + 0.6 * ratio, note: "Pay is below your expected range" };
  }

  calculateDistance(candidate: Candidate, job: ExternalJob): number | null {
    const workHomeLat = candidate.workProfile?.shared.homeLatitude;
    const workHomeLon = candidate.workProfile?.shared.homeLongitude;
    const cLat = typeof workHomeLat === "number" ? workHomeLat : candidate.locationLat;
    const cLon = typeof workHomeLon === "number" ? workHomeLon : candidate.locationLon;
    const jLat = job.locationLat;
    const jLon = job.locationLon;
    if (cLat === null || cLon === null || jLat === null || jLon === null) {
      return null;
    }
    return haversineKm({ lat: cLat, lon: cLon }, { lat: jLat, lon: jLon });
  }

  private calculateLocationMatch(candidate: Candidate, job: ExternalJob): number {
    const distanceKm = this.calculateDistance(candidate, job);
    if (distanceKm !== null) {
      if (distanceKm < 25) return 1.0;
      if (distanceKm < 50) return 0.85;
      if (distanceKm < 150) return 0.6;
      if (distanceKm < 400) return 0.35;
      return 0.15;
    }

    if (!job.locationArea) {
      return 0.5;
    }

    const summary = candidate.extractedData?.summary?.toLowerCase() ?? "";
    const locationLower = job.locationArea.toLowerCase();

    if (summary.includes(locationLower)) {
      return 1.0;
    }

    const saRegions = ["gauteng", "johannesburg", "cape town", "durban", "pretoria"];
    const jobInSa = saRegions.some((r) => locationLower.includes(r));
    const candidateInSa = saRegions.some((r) => summary.includes(r));

    if (jobInSa && candidateInSa) {
      return 0.7;
    }
    return 0.3;
  }

  isOutsideTravelRadius(candidate: Candidate, job: ExternalJob): boolean {
    const radius = candidate.workProfile?.shared.willingToTravelKm;
    if (radius == null || radius <= 0) return false;
    const distance = this.calculateDistance(candidate, job);
    if (distance === null) return false;
    return distance > radius;
  }

  // Graded travel penalty: 1.0 (no penalty) at/inside the radius, tapering to
  // OUTSIDE_RADIUS_PENALTY at TRAVEL_FULL_PENALTY_FACTOR× the radius — so a job
  // just past the radius is barely dinged instead of falling off a 60% cliff.
  travelRadiusMultiplier(candidate: Candidate, job: ExternalJob): number {
    const radius = candidate.workProfile?.shared.willingToTravelKm;
    if (radius == null || radius <= 0) return 1;
    const distance = this.calculateDistance(candidate, job);
    if (distance === null || distance <= radius) return 1;
    const overshoot = (distance - radius) / (radius * (TRAVEL_FULL_PENALTY_FACTOR - 1));
    const clamped = Math.min(1, Math.max(0, overshoot));
    return 1 - clamped * (1 - OUTSIDE_RADIUS_PENALTY);
  }

  private buildReasoning(
    embeddingSimilarity: number,
    skillsResult: { score: number; matched: string[]; missing: string[] },
    experienceMatch: number,
    locationMatch: number,
    salaryFitNote: string | null,
    job: ExternalJob,
    workBoost: { score: number | null; fieldMatched: boolean; roleMatched: boolean },
    distanceKm: number | null,
    outsideRadius: boolean,
  ): string {
    const simPct = Math.round(embeddingSimilarity * 100);

    const experienceLevel =
      experienceMatch >= 0.8
        ? "strong match"
        : experienceMatch >= 0.5
          ? "moderate match"
          : "limited match";

    const locationArea = job.locationArea;
    const locationLabel = locationArea ? locationArea : "unspecified";
    const distanceSuffix = distanceKm !== null ? `, ${Math.round(distanceKm)}km away` : "";
    const locationPart =
      locationMatch >= 0.7
        ? `Location: good match (${locationLabel}${distanceSuffix})`
        : `Location: ${locationLabel}${distanceSuffix}`;

    const parts = [
      `Profile similarity: ${simPct}%`,
      ...(skillsResult.matched.length > 0
        ? [`Matching skills: ${skillsResult.matched.join(", ")}`]
        : []),
      ...(skillsResult.missing.length > 0
        ? [`Missing skills: ${skillsResult.missing.join(", ")}`]
        : []),
      `Experience level: ${experienceLevel}`,
      locationPart,
      ...(salaryFitNote ? [`Salary: ${salaryFitNote}`] : []),
      ...(workBoost.fieldMatched ? ["Field match for your selected industry"] : []),
      ...(workBoost.roleMatched ? ["Role title matches your profile"] : []),
      ...(outsideRadius ? ["Outside your stated travel radius — score reduced"] : []),
    ];

    return parts.join(". ");
  }
}
