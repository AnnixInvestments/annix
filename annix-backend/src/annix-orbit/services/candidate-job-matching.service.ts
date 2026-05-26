import {
  type Commodity,
  DEFAULT_MATCH_TIER,
  expandWithAdjacentCategories,
  isJobCategoryKey,
  isMatchTier,
  type JobCategoryKey,
  type MatchTier,
  TRADE_LABELS,
  type TradeKey,
} from "@annix/product-data/sa-market";
import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch, MatchDetails } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../repositories/candidate-job-match.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
import { CvNotificationService } from "./cv-notification.service";
import { haversineKm } from "./geocode.service";

const WEIGHT_EMBEDDING = 0.5;
const WEIGHT_SKILLS = 0.25;
const WEIGHT_EXPERIENCE = 0.15;
const WEIGHT_LOCATION = 0.1;

const TRADE_PROFILE_BOOST_CAP = 0.1;
const TRADE_KEY_WEIGHT_WITHIN_BOOST = 0.6;
const COMMODITY_WEIGHT_WITHIN_BOOST = 0.4;
const OUTSIDE_RADIUS_PENALTY = 0.4;

const TOP_MATCHES_LIMIT = 20;

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
const RECOMMENDED_FETCH_WINDOW = 200;

const TRADE_KEY_KEYWORDS: Record<TradeKey, string[]> = {
  boilermaker: ["boilermaker", "boiler maker"],
  coded_welder: ["coded welder", "saqcc welder", "welder"],
  rubber_liner: ["rubber liner", "rubber lining"],
  pipe_fitter: ["pipe fitter", "pipefitter"],
  diesel_mechanic: ["diesel mechanic", "diesel mech"],
  rigger: ["rigger", "rigging"],
  electrician: ["electrician", "section 13"],
};

const COMMODITY_KEYWORDS: Record<Commodity, string[]> = {
  gold: ["gold"],
  coal: ["coal"],
  platinum: ["platinum", "pgm"],
  iron_ore: ["iron ore", "iron-ore"],
  manganese: ["manganese"],
  chrome: ["chrome", "chromite"],
  copper: ["copper"],
  diamond: ["diamond"],
  uranium: ["uranium"],
  nickel: ["nickel"],
};

@Injectable()
export class CandidateJobMatchingService {
  private readonly logger = new Logger(CandidateJobMatchingService.name);

  constructor(
    private readonly matchRepo: CandidateJobMatchRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly externalJobRepo: ExternalJobRepository,
    @Inject(forwardRef(() => CvNotificationService))
    private readonly notificationService: CvNotificationService,
  ) {}

  async matchCandidateToJobs(candidateId: number): Promise<CandidateJobMatch[]> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) {
      return [];
    } else {
      const narrowing = this.resolveCategoryNarrowing(candidate);
      const similarJobs = await this.findSimilarJobsByEmbedding(
        candidate,
        TOP_MATCHES_LIMIT,
        narrowing.pool,
      );

      const results = await Promise.all(
        similarJobs.map(async (row) => {
          const job = await this.externalJobRepo.findById(row.jobId);
          if (!job) {
            return null;
          } else {
            const categoryBoost = this.categoryBoostFor(job, narrowing);
            return this.scoreAndSaveMatch(
              candidate,
              job,
              row.similarity,
              candidateId,
              job.id,
              categoryBoost,
            );
          }
        }),
      );

      const matches = results.filter((m): m is CandidateJobMatch => m !== null);

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
    options: { includeDismissed?: boolean } = {},
  ): Promise<Array<CandidateJobMatch & { externalJob: ExternalJob }>> {
    const allMatches = await this.matchRepo.recommendedJobsForCandidate(
      candidateId,
      options.includeDismissed ?? false,
      RECOMMENDED_FETCH_WINDOW,
    );

    return this.applyStretchMatchDiversity(allMatches);
  }

  applyStretchMatchDiversity<T extends Pick<CandidateJobMatch, "overallScore">>(
    sortedMatches: T[],
  ): T[] {
    if (sortedMatches.length <= TOP_MATCHES_LIMIT) {
      return sortedMatches;
    }

    const reserved = STRETCH_RESERVED_SLOTS;
    const topPriorityCount = TOP_MATCHES_LIMIT - reserved;
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
    return combined.slice(0, TOP_MATCHES_LIMIT).sort((a, b) => b.overallScore - a.overallScore);
  }

  async matchingCandidatesForJob(
    externalJobId: number,
  ): Promise<Array<CandidateJobMatch & { candidate: Candidate }>> {
    return this.matchRepo.matchingCandidatesForJob(externalJobId, TOP_MATCHES_LIMIT);
  }

  async dismissMatch(matchId: number): Promise<void> {
    await this.matchRepo.setDismissed(matchId, true);
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
  ): Promise<Array<{ jobId: number; similarity: number }>> {
    const candidateVector = parseEmbedding(candidate.embedding);
    if (candidateVector === null) {
      return [];
    }

    const jobs = await this.externalJobRepo.jobsWithEmbedding(categoryPool);

    return rankBySimilarity(
      candidateVector,
      jobs.map((job) => ({ id: job.id, embedding: job.embedding })),
      limit,
    ).map((row) => ({ jobId: row.id, similarity: row.similarity }));
  }

  private async findSimilarCandidatesByEmbedding(
    job: ExternalJob,
    limit: number,
  ): Promise<Array<{ candidateId: number; similarity: number }>> {
    const jobVector = parseEmbedding(job.embedding);
    if (jobVector === null) {
      return [];
    }

    const candidates = await this.candidateRepo.candidatesWithEmbedding();

    return rankBySimilarity(
      jobVector,
      candidates.map((candidate) => ({ id: candidate.id, embedding: candidate.embedding })),
      limit,
    ).map((row) => ({ candidateId: row.id, similarity: row.similarity }));
  }

  private calculateSkillsOverlap(
    candidate: Candidate,
    job: ExternalJob,
  ): { score: number; matched: string[]; missing: string[] } {
    const candidateSkills = (candidate.extractedData?.skills ?? []).map((s) => s.toLowerCase());
    const jobSkills = job.extractedSkills.map((s) => s.toLowerCase());

    if (jobSkills.length === 0) {
      return { score: candidateSkills.length > 0 ? 0.5 : 0, matched: [], missing: [] };
    } else {
      const matched = jobSkills.filter((js) =>
        candidateSkills.some((cs) => cs.includes(js) || js.includes(cs)),
      );
      const missing = jobSkills.filter(
        (js) => !candidateSkills.some((cs) => cs.includes(js) || js.includes(cs)),
      );

      return {
        score: matched.length / jobSkills.length,
        matched,
        missing,
      };
    }
  }

  calculateTradeProfileBoost(
    candidate: Candidate,
    job: ExternalJob,
  ): {
    score: number | null;
    tradeKeyMatches: string[];
    commodityMatches: Commodity[];
  } {
    const profile = candidate.tradeProfile;
    if (!profile || profile.shared.tradeKeys.length === 0) {
      return { score: null, tradeKeyMatches: [], commodityMatches: [] };
    }
    const haystack =
      `${job.title ?? ""}\n${job.description ?? ""}\n${job.category ?? ""}`.toLowerCase();

    const tradeKeyMatches = profile.shared.tradeKeys.filter((key) =>
      TRADE_KEY_KEYWORDS[key].some((kw) => haystack.includes(kw)),
    );
    const tradeKeyScore = tradeKeyMatches.length > 0 ? 1 : 0;

    const commodityMatches = profile.shared.commoditiesWorked.filter((c) =>
      COMMODITY_KEYWORDS[c].some((kw) => haystack.includes(kw)),
    );
    const commodityScore =
      profile.shared.commoditiesWorked.length === 0
        ? 0
        : commodityMatches.length / profile.shared.commoditiesWorked.length;

    const score =
      tradeKeyScore * TRADE_KEY_WEIGHT_WITHIN_BOOST +
      commodityScore * COMMODITY_WEIGHT_WITHIN_BOOST;

    return {
      score,
      tradeKeyMatches: tradeKeyMatches.map((k) => TRADE_LABELS[k]),
      commodityMatches,
    };
  }

  private async scoreAndSaveMatch(
    candidate: Candidate,
    job: ExternalJob,
    embeddingSimilarity: number,
    candidateId: number,
    externalJobId: number,
    categoryBoost = 0,
  ): Promise<CandidateJobMatch> {
    const skillsResult = this.calculateSkillsOverlap(candidate, job);
    const experienceMatch = this.calculateExperienceMatch(candidate, job);
    const locationMatch = this.calculateLocationMatch(candidate, job);
    const tradeBoost = this.calculateTradeProfileBoost(candidate, job);
    const distanceKm = this.calculateDistance(candidate, job);
    const outsideRadius = this.isOutsideTradeRadius(candidate, job);

    const baseScore =
      embeddingSimilarity * WEIGHT_EMBEDDING +
      skillsResult.score * WEIGHT_SKILLS +
      experienceMatch * WEIGHT_EXPERIENCE +
      locationMatch * WEIGHT_LOCATION;

    const withTradeBoost =
      tradeBoost.score === null
        ? baseScore
        : Math.min(1, baseScore + tradeBoost.score * TRADE_PROFILE_BOOST_CAP);
    const withBoost = Math.min(1, withTradeBoost + categoryBoost);
    const overallScore = outsideRadius ? withBoost * OUTSIDE_RADIUS_PENALTY : withBoost;

    const matchDetails: MatchDetails = {
      embeddingSimilarity,
      skillsOverlap: skillsResult.score,
      skillsMatched: skillsResult.matched,
      skillsMissing: skillsResult.missing,
      experienceMatch,
      locationMatch,
      distanceKm: distanceKm === null ? null : Math.round(distanceKm),
      outsideTradeRadius: outsideRadius,
      reasoning: this.buildReasoning(
        embeddingSimilarity,
        skillsResult,
        experienceMatch,
        locationMatch,
        job,
        tradeBoost,
        distanceKm,
        outsideRadius,
      ),
    };

    const existing = await this.matchRepo.findByCandidateAndJob(candidateId, externalJobId);

    const structuredScore =
      skillsResult.score * (WEIGHT_SKILLS / (1 - WEIGHT_EMBEDDING)) +
      experienceMatch * (WEIGHT_EXPERIENCE / (1 - WEIGHT_EMBEDDING)) +
      locationMatch * (WEIGHT_LOCATION / (1 - WEIGHT_EMBEDDING));

    if (existing) {
      existing.similarityScore = embeddingSimilarity;
      existing.structuredScore = structuredScore;
      existing.overallScore = overallScore;
      existing.matchDetails = matchDetails;
      return this.matchRepo.save(existing);
    }

    return this.matchRepo.create({
      candidateId,
      externalJobId,
      similarityScore: embeddingSimilarity,
      structuredScore,
      overallScore,
      matchDetails,
    });
  }

  private calculateExperienceMatch(candidate: Candidate, _job: ExternalJob): number {
    const years = candidate.extractedData?.experienceYears;
    if (!years) {
      return 0.3;
    } else if (years >= 5) {
      return 1.0;
    } else if (years >= 3) {
      return 0.8;
    } else if (years >= 1) {
      return 0.5;
    } else {
      return 0.2;
    }
  }

  calculateDistance(candidate: Candidate, job: ExternalJob): number | null {
    const cLat = candidate.locationLat;
    const cLon = candidate.locationLon;
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

  isOutsideTradeRadius(candidate: Candidate, job: ExternalJob): boolean {
    const radius = candidate.tradeProfile?.shared.siteRadiusKm;
    if (radius == null || radius <= 0) return false;
    const distance = this.calculateDistance(candidate, job);
    if (distance === null) return false;
    return distance > radius;
  }

  private buildReasoning(
    embeddingSimilarity: number,
    skillsResult: { score: number; matched: string[]; missing: string[] },
    experienceMatch: number,
    locationMatch: number,
    job: ExternalJob,
    tradeBoost: { score: number | null; tradeKeyMatches: string[]; commodityMatches: Commodity[] },
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
      ...(tradeBoost.tradeKeyMatches.length > 0
        ? [`Trade match: ${tradeBoost.tradeKeyMatches.join(", ")}`]
        : []),
      ...(tradeBoost.commodityMatches.length > 0
        ? [`Commodity overlap: ${tradeBoost.commodityMatches.join(", ")}`]
        : []),
      ...(outsideRadius ? ["Outside your stated travel radius — score reduced"] : []),
    ];

    return parts.join(". ");
  }
}

function parseEmbedding(raw: string | null): number[] | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (trimmed.length === 0) {
    return null;
  }
  const values = trimmed.split(",").map((part) => Number.parseFloat(part.trim()));
  if (values.length === 0 || values.some((value) => Number.isNaN(value))) {
    return null;
  }
  return values;
}

function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length === 0 || a.length !== b.length) {
    return null;
  }
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return null;
  }
  return dot / (magnitudeA * magnitudeB);
}

function rankBySimilarity(
  queryVector: number[],
  rows: Array<{ id: number; embedding: string | null }>,
  limit: number,
): Array<{ id: number; similarity: number }> {
  return rows
    .flatMap((row) => {
      const vector = parseEmbedding(row.embedding);
      if (vector === null) {
        return [];
      }
      const similarity = cosineSimilarity(queryVector, vector);
      if (similarity === null) {
        return [];
      }
      return [{ id: row.id, similarity }];
    })
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit);
}
