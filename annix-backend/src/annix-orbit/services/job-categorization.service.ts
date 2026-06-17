import {
  isJobCategoryKey,
  JOB_CATEGORIES,
  type JobCategoryKey,
  matchAllJobCategoriesRuleBased,
  matchJobCategoryRuleBased,
  OTHER_JOB_CATEGORY,
} from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { isString } from "es-toolkit/compat";
import { now } from "../../lib/datetime";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { JobAnalysisCacheRepository } from "../repositories/job-analysis-cache.repository";
import { EscoNormalisationService } from "./esco-normalisation.service";

export interface JobCategorizationInput {
  title?: string | null;
  providerCategory?: string | null;
  description?: string | null;
}

export interface CandidateCategorizationInput {
  summary?: string | null;
  skills?: string[] | null;
  certifications?: string[] | null;
  qualifications?: string[] | null;
}

const MAX_TARGET_CATEGORIES = 3;

interface AiCategoryResponse {
  category?: string;
}

interface AiCategoriesResponse {
  categories?: string[];
}

interface AiJobAnalysisResponse {
  category?: string;
  skills?: string[];
}

export interface JobAnalysis {
  category: JobCategoryKey | null;
  skills: string[];
  // True when the daily analysis cap was hit and no AI call ran — callers should
  // leave the job unanalysed (retry another day) rather than stamp it empty.
  skipped?: boolean;
}

const MAX_JOB_SKILLS = 20;

// Cheap model for simple category/skills classification. Full flash is reserved
// for nuanced extraction (CV/document parsing). Override via env if needed.
const CLASSIFIER_MODEL = process.env.ORBIT_CLASSIFIER_MODEL || "gemini-2.5-flash-lite";

// Daily ceiling on Gemini job-analysis calls so a runaway backfill/ingestion
// surge can't spike spend. Override via env.
const DEFAULT_JOB_ANALYSIS_DAILY_CAP = 3000;

// Skip the LLM only when rule-based classification is confident AND finds at
// least this many concrete ESCO skills in the job text — protects match quality.
const MIN_RULE_SKILLS = 4;

const ALLOWED_KEYS = JOB_CATEGORIES.map((category) => `${category.key} (${category.label})`).join(
  "\n",
);

const SYSTEM_PROMPT = `You classify South African job listings into exactly one category.
Respond ONLY with JSON: {"category": "<key>"} where <key> is one of these exact keys:
${ALLOWED_KEYS}

Pick the single best fit. If nothing fits, use "other". Never invent a key.`;

const CANDIDATE_SYSTEM_PROMPT = `You read a South African job-seeker's CV profile and pick the job categories they are most suited to.
Respond ONLY with JSON: {"categories": ["<key>", ...]} listing 1 to ${MAX_TARGET_CATEGORIES} of these exact keys, best fit first:
${ALLOWED_KEYS}

Use the fewest keys that genuinely fit. Never invent a key. Omit "other" unless nothing else fits.`;

const ANALYZE_SYSTEM_PROMPT = `You read a South African job listing and return BOTH its category and the concrete skills it needs.
Respond ONLY with JSON: {"category": "<key>", "skills": ["skill1", "skill2", ...]}.
- "category": exactly one of these keys (use "other" only if nothing fits, never invent a key):
${ALLOWED_KEYS}
- "skills": ${MAX_JOB_SKILLS > 0 ? `up to ${MAX_JOB_SKILLS}` : "the"} specific, concrete skills/tools/competencies the role requires — e.g. "welding", "payroll", "fleet management", "sql", "forklift licence". Lowercase. Prefer hard, nameable skills over generic soft words ("communication", "teamwork"). Return an empty array if none are clear.`;

@Injectable()
export class JobCategorizationService {
  private readonly logger = new Logger(JobCategorizationService.name);
  private readonly aiCache = new Map<string, JobCategoryKey>();
  private readonly analysisCache = new Map<string, JobAnalysis>();

  private aiCallsToday = 0;
  private aiCallsDate = "";
  private readonly dailyAnalysisCap = (() => {
    const raw = Number(process.env.ORBIT_JOB_ANALYSIS_DAILY_CAP);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_JOB_ANALYSIS_DAILY_CAP;
  })();

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly analysisCacheRepo: JobAnalysisCacheRepository,
    private readonly escoService: EscoNormalisationService,
  ) {}

  // Reserves one slot against the daily analysis cap (reset each day). Returns
  // false once the cap is reached so callers skip the Gemini call.
  private consumeDailyAnalysisBudget(): boolean {
    const today = now().toISODate() ?? "";
    if (today !== this.aiCallsDate) {
      this.aiCallsDate = today;
      this.aiCallsToday = 0;
    }
    if (this.aiCallsToday >= this.dailyAnalysisCap) {
      return false;
    }
    this.aiCallsToday += 1;
    return true;
  }

  // One Gemini pass over a job returning BOTH its category and its required
  // skills, so ingestion populates extractedSkills without a second LLM call.
  // Falls back to an empty result on any failure (ingestion must never break).
  async analyzeJob(input: JobCategorizationInput): Promise<JobAnalysis> {
    const title = (input.title ?? "").trim();
    if (title.length === 0) {
      return { category: null, skills: [] };
    }
    const description = (input.description ?? "").trim();
    const cacheKey = `${title.toLowerCase()}::${description.slice(0, 80).toLowerCase()}`;
    const cached = this.analysisCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const persisted = await this.analysisCacheRepo.findByKey(cacheKey).catch(() => null);
    if (persisted) {
      const persistedCategory = persisted.category;
      const fromCache: JobAnalysis = {
        category:
          persistedCategory && isJobCategoryKey(persistedCategory) ? persistedCategory : null,
        skills: persisted.skills,
      };
      this.analysisCache.set(cacheKey, fromCache);
      return fromCache;
    }
    const ruleResult = await this.ruleBasedAnalysis(input, title, description);
    if (ruleResult) {
      this.analysisCache.set(cacheKey, ruleResult);
      void this.analysisCacheRepo
        .upsert({ key: cacheKey, category: ruleResult.category, skills: ruleResult.skills })
        .catch(() => undefined);
      return ruleResult;
    }
    if (!this.consumeDailyAnalysisBudget()) {
      this.logger.warn(
        `Daily job-analysis cap (${this.dailyAnalysisCap}) reached — skipping AI analysis for "${title}"`,
      );
      return { category: this.ruleBased(input), skills: [], skipped: true };
    }
    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: this.buildPrompt(input) }],
        ANALYZE_SYSTEM_PROMPT,
        undefined,
        {
          temperature: 0,
          responseFormat: "json",
          thinkingBudget: 0,
          maxOutputTokens: 512,
          model: CLASSIFIER_MODEL,
        },
      );
      const parsed = parseJsonFromAi<AiJobAnalysisResponse>(response.content);
      const rawCategory = parsed.category ? parsed.category.trim() : "";
      const category = isJobCategoryKey(rawCategory) ? rawCategory : null;
      const skills = [
        ...new Set(
          (parsed.skills ?? [])
            .filter((value): value is string => isString(value))
            .map((value) => value.trim().toLowerCase())
            .filter((value) => value.length > 1 && value.length <= 60),
        ),
      ].slice(0, MAX_JOB_SKILLS);
      const result: JobAnalysis = { category, skills };
      this.analysisCache.set(cacheKey, result);
      void this.analysisCacheRepo
        .upsert({ key: cacheKey, category, skills })
        .catch(() => undefined);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI job analysis failed for "${title}": ${message}`);
      return { category: null, skills: [] };
    }
  }

  // Free pre-pass: a confident rule-based category plus enough concrete ESCO
  // skills found in the job text lets us skip the Gemini call entirely. Returns
  // null (fall back to the LLM) when the category is unclear or skills are thin,
  // so match quality is never degraded for ambiguous listings.
  private async ruleBasedAnalysis(
    input: JobCategorizationInput,
    title: string,
    description: string,
  ): Promise<JobAnalysis | null> {
    try {
      const category = matchJobCategoryRuleBased(input);
      if (!category) {
        return null;
      }
      const skills = await this.escoService.extractSkillsFromText(
        `${title}\n${description}`,
        MAX_JOB_SKILLS,
      );
      if (skills.length < MIN_RULE_SKILLS) {
        return null;
      }
      return { category, skills };
    } catch {
      return null;
    }
  }

  ruleBased(input: JobCategorizationInput): JobCategoryKey | null {
    return matchJobCategoryRuleBased(input);
  }

  async categorize(input: JobCategorizationInput): Promise<JobCategoryKey> {
    const ruled = matchJobCategoryRuleBased(input);
    if (ruled) return ruled;
    const aiKey = await this.categorizeWithAi(input);
    return aiKey ?? OTHER_JOB_CATEGORY;
  }

  async categorizeCandidate(input: CandidateCategorizationInput): Promise<JobCategoryKey[]> {
    const profileText = this.candidateText(input);
    if (profileText.length === 0) return [];

    const ruled = matchAllJobCategoriesRuleBased(profileText, MAX_TARGET_CATEGORIES);
    if (ruled.length > 0) return ruled;

    return this.categorizeCandidateWithAi(profileText);
  }

  private candidateText(input: CandidateCategorizationInput): string {
    const skills = input.skills ?? [];
    const certifications = input.certifications ?? [];
    const qualifications = input.qualifications ?? [];
    const parts = [
      input.summary ?? "",
      skills.length > 0 ? skills.join(", ") : "",
      certifications.length > 0 ? certifications.join(", ") : "",
      qualifications.length > 0 ? qualifications.join(", ") : "",
    ].filter((part) => part.trim().length > 0);
    return parts.join("\n").slice(0, 2000);
  }

  private async categorizeCandidateWithAi(profileText: string): Promise<JobCategoryKey[]> {
    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: profileText }],
        CANDIDATE_SYSTEM_PROMPT,
        undefined,
        {
          temperature: 0,
          responseFormat: "json",
          thinkingBudget: 0,
          maxOutputTokens: 128,
          model: CLASSIFIER_MODEL,
        },
      );
      const parsed = parseJsonFromAi<AiCategoriesResponse>(response.content);
      const raw = parsed.categories ?? [];
      const valid = raw
        .filter((value): value is string => isString(value))
        .map((value) => value.trim())
        .filter((value): value is JobCategoryKey => isJobCategoryKey(value));
      const deduped = [...new Set(valid)];
      return deduped.slice(0, MAX_TARGET_CATEGORIES);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI candidate categorization failed: ${message}`);
      return [];
    }
  }

  private async categorizeWithAi(input: JobCategorizationInput): Promise<JobCategoryKey | null> {
    const title = (input.title ?? "").trim();
    if (title.length === 0) return null;

    const providerCategory = (input.providerCategory ?? "").trim();
    const cacheKey = `${title.toLowerCase()}::${providerCategory.toLowerCase()}`;
    const cached = this.aiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: this.buildPrompt(input) }],
        SYSTEM_PROMPT,
        undefined,
        {
          temperature: 0,
          responseFormat: "json",
          thinkingBudget: 0,
          maxOutputTokens: 64,
          model: CLASSIFIER_MODEL,
        },
      );
      const parsed = parseJsonFromAi<AiCategoryResponse>(response.content);
      const candidate = parsed.category ? parsed.category.trim() : "";
      if (isJobCategoryKey(candidate)) {
        this.aiCache.set(cacheKey, candidate);
        return candidate;
      }
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI categorization failed for "${title}": ${message}`);
      return null;
    }
  }

  private buildPrompt(input: JobCategorizationInput): string {
    const description = (input.description ?? "").slice(0, 1200);
    const lines = [
      `Title: ${input.title ?? "(not provided)"}`,
      `Source category: ${input.providerCategory ?? "(not provided)"}`,
      "",
      "Description:",
      description.length > 0 ? description : "(no description)",
    ];
    return lines.join("\n");
  }
}
