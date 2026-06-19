import { createHash } from "node:crypto";
import {
  DEFAULT_MATCH_TIER,
  expandWithAdjacentCategories,
  isJobCategoryKey,
  isMatchTier,
  type JobCategoryKey,
} from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { estimateAiCostUsd } from "../../ai-usage/ai-pricing";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
import { AiApp, AiProvider } from "../../ai-usage/entities/ai-usage-log.entity";
import { EmailService } from "../../email/email.service";
import { DateTime, nowMillis } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { isAnnixOrbitCronEnabled } from "../annix-orbit-cron.config";
import { Candidate } from "../entities/candidate.entity";
import { ExternalJob } from "../entities/external-job.entity";
import {
  ActiveCandidateTargetRow,
  CandidateRepository,
} from "../repositories/candidate.repository";
import {
  ExternalJobRepository,
  JobEmbeddingDemandClause,
} from "../repositories/external-job.repository";
import { targetCountriesOf } from "./candidate-job-matching.service";
import { EscoNormalisationService } from "./esco-normalisation.service";
import { JobCategorizationService } from "./job-categorization.service";

const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
const GEMINI_EMBEDDING_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBEDDING_DIMENSIONS = 768;

const JOB_EMBEDDING_BACKFILL_BATCH = 200;

// Cap on how many backlog jobs a single lazy-backfill trigger (new candidate /
// changed targets) will embed in one go. Bounded so a first-candidate-in-a-new-
// category populates promptly without an unbounded embed of the whole pool; the
// 6-hourly demand-aware cron sweeps any remainder.
const LAZY_BACKFILL_CAP = 1_000;

// In-memory TTL for the active-demand set so we don't run the candidate
// aggregation per ingested job. invalidate() clears it when targets change.
const ACTIVE_DEMAND_TTL_MS = 10 * 60 * 1000;

const DEFAULT_EMBEDDING_DAILY_CALLS_THRESHOLD = 5_000;
const DEFAULT_EMBEDDING_DAILY_COST_USD_THRESHOLD = 5;
const GEMINI_EMBEDDING_USD_PER_1K_TOKENS = 0.000025;

// The classifier model the vetting/analysis/category actionTypes run on — used to
// price their token usage in the cost guard. Mirrors the default in
// JobCategorizationService / JobVettingService.
const CLASSIFIER_GUARD_MODEL = process.env.ORBIT_CLASSIFIER_MODEL || "gemini-2.5-flash-lite";

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

// The active-demand set (C1): the category+country pairs some active candidate
// targets, in the matcher's exact granularity. A null `categories` clause is a
// wildcard over every category in those countries (soft-tier seekers).
interface ActiveDemand {
  clauses: JobEmbeddingDemandClause[];
  wildcardCountries: Set<string>;
  pairKeys: Set<string>;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly apiKey: string;
  private backfillRunning = false;
  private lastEmbedError: string | null = null;
  private lastBackfillError: string | null = null;
  private activeDemand: ActiveDemand | null = null;
  private activeDemandLoadedAtMs = 0;
  private activeDemandInflight: Promise<ActiveDemand> | null = null;

  constructor(
    private readonly candidateRepo: CandidateRepository,
    private readonly externalJobRepo: ExternalJobRepository,
    private readonly aiUsageService: AiUsageService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly escoService: EscoNormalisationService,
    private readonly jobCategorizationService: JobCategorizationService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {
    this.apiKey = process.env.GEMINI_API_KEY ?? "";
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!this.apiKey) {
      this.lastEmbedError = "GEMINI_API_KEY not set";
      this.logger.warn("GEMINI_API_KEY not set, skipping embedding generation");
      return null;
    }

    const truncatedText = text.slice(0, 8000);

    const url = `${GEMINI_EMBEDDING_URL}/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${this.apiKey}`;

    const startTime = nowMillis();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${GEMINI_EMBEDDING_MODEL}`,
          content: {
            parts: [{ text: truncatedText }],
          },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.lastEmbedError = `Gemini ${response.status}: ${errorText.slice(0, 300)}`;
        this.logger.error(`Gemini embedding API error ${response.status}: ${errorText}`);
        return null;
      }

      const data: GeminiEmbeddingResponse = await response.json();
      const processingTimeMs = nowMillis() - startTime;

      this.aiUsageService.log({
        app: AiApp.ANNIX_ORBIT,
        actionType: "embedding-generation",
        provider: AiProvider.GEMINI,
        model: GEMINI_EMBEDDING_MODEL,
        tokensUsed: Math.ceil(truncatedText.length / 4),
        processingTimeMs,
      });

      const values = data.embedding?.values ?? null;
      if (!values || values.length === 0) {
        this.lastEmbedError = `Gemini returned no embedding values (keys: ${Object.keys(data).join(",")})`;
        return null;
      }
      return values;
    } catch (err) {
      this.lastEmbedError = `Embedding request failed: ${err instanceof Error ? err.message : String(err)}`;
      this.logger.error(this.lastEmbedError);
      return null;
    }
  }

  async candidateEmbeddingText(candidate: Candidate): Promise<string> {
    if (!candidate.extractedData) {
      return candidate.rawCvText ? candidate.rawCvText.slice(0, 4000) : "";
    }
    const data = candidate.extractedData;
    const expandedSkills = await this.expandSkillList(data.skills);
    const extractedParts = [
      ...(data.summary ? [data.summary] : []),
      ...(expandedSkills.length > 0 ? [`Skills: ${expandedSkills.join(", ")}`] : []),
      ...(data.education.length > 0 ? [`Education: ${data.education.join(", ")}`] : []),
      ...(data.certifications.length > 0
        ? [`Certifications: ${data.certifications.join(", ")}`]
        : []),
      ...(data.experienceYears ? [`Experience: ${data.experienceYears} years`] : []),
    ];
    const parts =
      extractedParts.length === 0 && candidate.rawCvText
        ? [candidate.rawCvText.slice(0, 4000)]
        : extractedParts;
    return parts.join("\n");
  }

  async jobEmbeddingText(job: ExternalJob): Promise<string> {
    const expandedSkills = await this.expandSkillList(job.extractedSkills ?? []);
    const parts = [
      job.title,
      ...(job.company ? [`Company: ${job.company}`] : []),
      ...(job.locationRaw ? [`Location: ${job.locationRaw}`] : []),
      ...(job.category ? [`Category: ${job.category}`] : []),
      ...(job.description ? [job.description.slice(0, 4000)] : []),
      ...(expandedSkills.length > 0 ? [`Skills: ${expandedSkills.join(", ")}`] : []),
    ];
    return parts.join("\n");
  }

  private async expandSkillList(rawSkills: string[]): Promise<string[]> {
    if (rawSkills.length === 0) return [];
    try {
      const normalised = await this.escoService.canonicaliseAll(rawSkills);
      return this.escoService.expandedSkillTokens(rawSkills, normalised);
    } catch (err) {
      this.logger.warn(
        `ESCO expansion failed, falling back to raw skills: ${err instanceof Error ? err.message : String(err)}`,
      );
      return rawSkills;
    }
  }

  async embedCandidate(candidateId: number): Promise<boolean> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) {
      return false;
    }

    const text = await this.candidateEmbeddingText(candidate);
    if (!text) {
      this.logger.warn(`No text to embed for candidate ${candidateId}`);
      return false;
    }

    await this.updateTargetCategories(candidate);

    const textHash = embeddingTextHash(text);
    if (candidate.embedding != null && candidate.embeddingTextHash === textHash) {
      return true;
    }

    const embedding = await this.generateEmbedding(text);
    if (!embedding) {
      return false;
    }

    await this.candidateRepo.setEmbeddingVector(candidateId, embedding, textHash);

    return true;
  }

  private async updateTargetCategories(candidate: Candidate): Promise<void> {
    const extracted = candidate.extractedData;
    if (!extracted) return;
    try {
      const targetCategories = await this.jobCategorizationService.categorizeCandidate({
        summary: extracted.summary,
        skills: extracted.skills,
        certifications: extracted.certifications,
        qualifications: extracted.saQualifications,
      });
      candidate.targetCategories = targetCategories;
      await this.candidateRepo.save(candidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to derive target categories for candidate ${candidate.id}: ${message}`,
      );
    }
  }

  // The active-demand set, cached with a short TTL. Computed via ONE candidate
  // aggregation (activeTargetRows) so the per-job ingest gate never aggregates.
  async activeDemandSet(): Promise<ActiveDemand> {
    const fresh =
      this.activeDemand !== null &&
      nowMillis() - this.activeDemandLoadedAtMs < ACTIVE_DEMAND_TTL_MS;
    if (fresh && this.activeDemand !== null) {
      return this.activeDemand;
    }
    if (this.activeDemandInflight !== null) {
      return this.activeDemandInflight;
    }
    this.activeDemandInflight = this.computeActiveDemand()
      .then((demand) => {
        this.activeDemand = demand;
        this.activeDemandLoadedAtMs = nowMillis();
        return demand;
      })
      .finally(() => {
        this.activeDemandInflight = null;
      });
    return this.activeDemandInflight;
  }

  private async computeActiveDemand(): Promise<ActiveDemand> {
    const rows = await this.candidateRepo.activeTargetRows();
    return buildActiveDemand(rows);
  }

  invalidateActiveDemand(): void {
    this.activeDemand = null;
    this.activeDemandLoadedAtMs = 0;
  }

  // True when SOME active candidate would consider a job of this category+country
  // — i.e. embedding it could surface it to a seeker. Mirrors the matcher's
  // embeddingFilter granularity so the gate and the matcher always agree.
  async jobIsInActiveDemand(
    canonicalCategory: string | null,
    country: string | null,
  ): Promise<boolean> {
    const demand = await this.activeDemandSet();
    return demandCovers(demand, canonicalCategory, country);
  }

  // Lazy backfill (C1): when a candidate appears or changes targets, embed the
  // backlog of jobs in the newly-demanded category+country that lack embeddings,
  // so the new seeker's pool is populated promptly. Invalidates the demand cache
  // first, then embeds bounded by LAZY_BACKFILL_CAP. Idempotent: jobs already
  // embedded are excluded by jobsMissingEmbedding.
  async backfillForActiveDemand(): Promise<{ processed: number; failed: number }> {
    this.invalidateActiveDemand();
    const demand = await this.activeDemandSet();
    if (demand.clauses.length === 0) {
      return { processed: 0, failed: 0 };
    }
    const pending = await this.externalJobRepo.jobsMissingEmbedding(
      LAZY_BACKFILL_CAP,
      demand.clauses,
    );
    return pending.reduce(
      async (accPromise, job) => {
        const acc = await accPromise;
        const success = await this.embedExternalJob(job.id);
        return success
          ? { processed: acc.processed + 1, failed: acc.failed }
          : { processed: acc.processed, failed: acc.failed + 1 };
      },
      Promise.resolve({ processed: 0, failed: 0 }),
    );
  }

  async embedExternalJob(jobId: number): Promise<boolean> {
    const job = await this.externalJobRepo.findById(jobId);
    if (!job) {
      return false;
    }

    const text = await this.jobEmbeddingText(job);
    if (!text) {
      return false;
    }

    const textHash = embeddingTextHash(text);
    const state = await this.externalJobRepo.jobEmbeddingState(jobId);
    if (state.hasEmbedding && state.textHash === textHash) {
      return true;
    }

    const embedding = await this.generateEmbedding(text);
    if (!embedding) {
      return false;
    }

    await this.externalJobRepo.setEmbeddingVector(jobId, embedding, textHash);

    return true;
  }

  async backfillCandidateEmbeddings(): Promise<{ processed: number; failed: number }> {
    const candidates = await this.candidateRepo.candidatesMissingEmbedding();

    const result = await candidates.reduce(
      async (accPromise, candidate) => {
        const acc = await accPromise;
        const success = await this.embedCandidate(candidate.id);
        return success
          ? { processed: acc.processed + 1, failed: acc.failed }
          : { processed: acc.processed, failed: acc.failed + 1 };
      },
      Promise.resolve({ processed: 0, failed: 0 }),
    );

    this.logger.log(
      `Backfilled embeddings: ${result.processed} processed, ${result.failed} failed`,
    );
    return result;
  }

  // Demand-aware backfill: only embeds missing-embedding jobs whose
  // category+country is in the active-demand set (C1) — otherwise the cron would
  // re-embed the whole pool and defeat the ingest-time gate. Pass `null` only
  // from the explicit bulk one-time backfill script that wants everything.
  async backfillExternalJobEmbeddings(
    demand: JobEmbeddingDemandClause[] | null = null,
  ): Promise<{ processed: number; failed: number }> {
    if (demand !== null && demand.length === 0) {
      return { processed: 0, failed: 0 };
    }
    let result = { processed: 0, failed: 0 };
    let batch = await this.externalJobRepo.jobsMissingEmbedding(
      JOB_EMBEDDING_BACKFILL_BATCH,
      demand,
    );
    while (batch.length > 0) {
      const batchResult = await batch.reduce(
        async (accPromise, job) => {
          const acc = await accPromise;
          const success = await this.embedExternalJob(job.id);
          return success
            ? { processed: acc.processed + 1, failed: acc.failed }
            : { processed: acc.processed, failed: acc.failed + 1 };
        },
        Promise.resolve({ processed: 0, failed: 0 }),
      );
      result = {
        processed: result.processed + batchResult.processed,
        failed: result.failed + batchResult.failed,
      };
      // Failures keep matching jobsMissingEmbedding, so stop once a batch makes no
      // forward progress — otherwise the same un-embeddable jobs loop forever.
      if (batchResult.processed === 0 || batch.length < JOB_EMBEDDING_BACKFILL_BATCH) {
        break;
      }
      batch = await this.externalJobRepo.jobsMissingEmbedding(JOB_EMBEDDING_BACKFILL_BATCH, demand);
    }

    this.logger.log(
      `Backfilled job embeddings: ${result.processed} processed, ${result.failed} failed`,
    );
    return result;
  }

  dimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }

  async embeddingCoverage(): Promise<{
    jobsTotal: number;
    jobsEmbedded: number;
    candidatesTotal: number;
    candidatesEmbedded: number;
    running: boolean;
    lastError: string | null;
  }> {
    const jobs = await this.externalJobRepo.embeddingCoverage();
    const candidates = await this.candidateRepo.embeddingCoverage();
    return {
      jobsTotal: jobs.total,
      jobsEmbedded: jobs.embedded,
      candidatesTotal: candidates.total,
      candidatesEmbedded: candidates.embedded,
      running: this.backfillRunning,
      lastError: this.lastBackfillError ?? this.lastEmbedError,
    };
  }

  startBackfillInBackground(): { started: boolean; alreadyRunning: boolean } {
    if (this.backfillRunning) {
      return { started: false, alreadyRunning: true };
    }
    this.backfillRunning = true;
    this.lastBackfillError = null;
    this.lastEmbedError = null;
    void this.extractionMetricService
      .time("orbit-embedding-backfill", "all", async () => {
        const candidates = await this.backfillCandidateEmbeddings();
        const demand = await this.activeDemandSet();
        const jobs = await this.backfillExternalJobEmbeddings(demand.clauses);
        this.logger.log(
          `On-demand backfill complete: candidates ${candidates.processed} embedded / ${candidates.failed} failed, jobs ${jobs.processed} embedded / ${jobs.failed} failed`,
        );
        return jobs.processed + candidates.processed;
      })
      .catch((err) => {
        this.lastBackfillError = err instanceof Error ? err.message : String(err);
        this.logger.error(`On-demand embedding backfill failed: ${this.lastBackfillError}`);
      })
      .finally(() => {
        this.backfillRunning = false;
      });
    return { started: true, alreadyRunning: false };
  }

  @Cron("0 */6 * * *", { name: "annix-orbit:embedding-backfill" })
  async embeddingBackfillCron(): Promise<{
    candidates: { processed: number; failed: number };
    jobs: { processed: number; failed: number };
  } | null> {
    if (!isAnnixOrbitCronEnabled()) {
      return null;
    }
    const candidates = await this.backfillCandidateEmbeddings();
    this.invalidateActiveDemand();
    const demand = await this.activeDemandSet();
    const jobs = await this.backfillExternalJobEmbeddings(demand.clauses);
    return { candidates, jobs };
  }

  // One daily cron guards the embedding spend AND the classifier-backed Gemini
  // actionTypes (vetting + job analysis/category). Each is aggregated and alerted
  // independently against the shared thresholds so a runaway on any one of them
  // pages support. Kept as a single cron to share the daily wake-up.
  @Cron("0 6 * * *", { name: "annix-orbit:embedding-cost-guard" })
  async embeddingCostGuard(): Promise<{
    calls: number;
    tokens: number;
    estimatedUsd: number;
    alerted: boolean;
  } | null> {
    if (!isAnnixOrbitCronEnabled()) {
      return null;
    }
    const embedding = await this.runEmbeddingCostGuard();
    await this.runActionTypeCostGuards();
    return embedding;
  }

  private orbitActionGuardTargets(): Array<{ label: string; actionType: string }> {
    return [
      { label: "job vetting", actionType: "orbit-job-vetting" },
      { label: "job analysis", actionType: "orbit-job-analysis" },
      { label: "job category", actionType: "orbit-job-category" },
    ];
  }

  private async runActionTypeCostGuards(): Promise<void> {
    const since = DateTime.now().minus({ hours: 24 }).toJSDate();
    const callsThreshold = this.callsThreshold();
    const costThreshold = this.costThreshold();
    await this.orbitActionGuardTargets().reduce(async (prev, target) => {
      await prev;
      const { calls, tokens } = await this.aiUsageService.aggregateDailyUsageByActionType(
        target.actionType,
        since,
      );
      const estimatedUsd = estimateAiCostUsd(CLASSIFIER_GUARD_MODEL, null, null, tokens);
      await this.alertIfBreached(target.label, calls, tokens, estimatedUsd, {
        callsThreshold,
        costThreshold,
      });
    }, Promise.resolve());
  }

  private callsThreshold(): number {
    return Number(
      this.configService.get<string>("CV_EMBEDDING_DAILY_CALLS_THRESHOLD") ??
        DEFAULT_EMBEDDING_DAILY_CALLS_THRESHOLD,
    );
  }

  private costThreshold(): number {
    return Number(
      this.configService.get<string>("CV_EMBEDDING_DAILY_COST_USD_THRESHOLD") ??
        DEFAULT_EMBEDDING_DAILY_COST_USD_THRESHOLD,
    );
  }

  async runEmbeddingCostGuard(): Promise<{
    calls: number;
    tokens: number;
    estimatedUsd: number;
    alerted: boolean;
  }> {
    const since = DateTime.now().minus({ hours: 24 }).toJSDate();
    const { calls, tokens } = await this.aiUsageService.aggregateDailyUsageByModel(
      GEMINI_EMBEDDING_MODEL,
      since,
    );
    const estimatedUsd = (tokens / 1000) * GEMINI_EMBEDDING_USD_PER_1K_TOKENS;

    const alerted = await this.alertIfBreached(
      GEMINI_EMBEDDING_MODEL,
      calls,
      tokens,
      estimatedUsd,
      {
        callsThreshold: this.callsThreshold(),
        costThreshold: this.costThreshold(),
      },
    );
    return { calls, tokens, estimatedUsd, alerted };
  }

  // Shared breach check + alert for a single guarded usage stream (embedding or
  // an actionType). Returns whether an alert was sent.
  private async alertIfBreached(
    label: string,
    calls: number,
    tokens: number,
    estimatedUsd: number,
    thresholds: { callsThreshold: number; costThreshold: number },
  ): Promise<boolean> {
    const { callsThreshold, costThreshold } = thresholds;
    if (calls < callsThreshold && estimatedUsd < costThreshold) {
      return false;
    }

    const recipient =
      this.configService.get<string>("SUPPORT_EMAIL") ||
      this.configService.get<string>("EMAIL_FROM") ||
      "info@annix.co.za";

    const breaches: string[] = [];
    if (calls >= callsThreshold) {
      breaches.push(`Calls in 24h: ${calls} (threshold ${callsThreshold})`);
    }
    if (estimatedUsd >= costThreshold) {
      breaches.push(
        `Estimated cost in 24h: $${estimatedUsd.toFixed(4)} (threshold $${costThreshold})`,
      );
    }
    const lines = [
      `${label} usage exceeded the configured guardrails.`,
      `Stream: ${label}`,
      `Calls: ${calls}`,
      `Tokens: ${tokens}`,
      `Estimated USD: $${estimatedUsd.toFixed(4)}`,
      ...breaches.map((line) => `→ ${line}`),
      "Inspect ai_usage_logs for the runaway adapter and consider pausing the source.",
    ];
    const text = lines.join("\n");
    const html = `<p>${lines.map((l) => escapeHtmlForEmail(l)).join("</p><p>")}</p>`;

    try {
      await this.emailService.sendEmail({
        to: recipient,
        subject: `[Annix Orbit] ${label} cost guard tripped (${calls} calls / $${estimatedUsd.toFixed(2)} in 24h)`,
        text,
        html,
      });
      this.logger.warn(
        `${label} cost guard tripped: calls=${calls} tokens=${tokens} estUsd=${estimatedUsd.toFixed(4)}`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to send ${label} cost guard alert: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}

function embeddingTextHash(text: string): string {
  return createHash("sha1").update(text).digest("hex");
}

function pairKey(category: string, country: string): string {
  return `${category}|${country}`;
}

// Convert active-candidate target rows into the demand set, mirroring the
// matcher's resolveCategoryNarrowing tier→pool logic + targetCountriesOf default
// exactly: hard → exact targets, medium → adjacent categories, soft / no-targets
// → wildcard (all categories). Countries default to ["za"].
export function buildActiveDemand(rows: ActiveCandidateTargetRow[]): ActiveDemand {
  const wildcardCountries = new Set<string>();
  const categoriesByCountry = new Map<string, Set<string>>();

  rows.forEach((row) => {
    const tier = isMatchTier(row.matchTier) ? row.matchTier : DEFAULT_MATCH_TIER;
    const targets = row.targetCategories.filter((key): key is JobCategoryKey =>
      isJobCategoryKey(key),
    );
    const countries = targetCountriesOf(row.targetCountries).map((c) => c.toLowerCase());
    const pool =
      targets.length === 0
        ? null
        : tier === "hard"
          ? targets
          : tier === "medium"
            ? expandWithAdjacentCategories(targets)
            : null;

    if (pool === null) {
      countries.forEach((country) => wildcardCountries.add(country));
      return;
    }
    countries.forEach((country) => {
      const existing = categoriesByCountry.get(country) ?? new Set<string>();
      pool.forEach((category) => existing.add(category));
      categoriesByCountry.set(country, existing);
    });
  });

  const pairKeys = new Set<string>();
  const clauses: JobEmbeddingDemandClause[] = [];

  if (wildcardCountries.size > 0) {
    clauses.push({ categories: null, countries: [...wildcardCountries] });
  }

  categoriesByCountry.forEach((categories, country) => {
    if (wildcardCountries.has(country)) {
      return;
    }
    clauses.push({ categories: [...categories], countries: [country] });
    categories.forEach((category) => pairKeys.add(pairKey(category, country)));
  });

  return { clauses, wildcardCountries, pairKeys };
}

// True when SOME demand clause covers this job's category+country, in the
// matcher's granularity. A null category can only be covered by a wildcard
// clause (the matcher can only surface uncategorised jobs to soft-tier seekers,
// whose pool is null).
function demandCovers(
  demand: ActiveDemand,
  canonicalCategory: string | null,
  country: string | null,
): boolean {
  const normalisedCountry = (country ?? "").toLowerCase();
  if (normalisedCountry === "") {
    return false;
  }
  if (demand.wildcardCountries.has(normalisedCountry)) {
    return true;
  }
  if (canonicalCategory === null || canonicalCategory === "") {
    return false;
  }
  return demand.pairKeys.has(pairKey(canonicalCategory, normalisedCountry));
}

function escapeHtmlForEmail(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
