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
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

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
}

const MAX_JOB_SKILLS = 20;

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

  constructor(private readonly aiChatService: AiChatService) {}

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
    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: this.buildPrompt(input) }],
        ANALYZE_SYSTEM_PROMPT,
        undefined,
        { temperature: 0, responseFormat: "json" },
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
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`AI job analysis failed for "${title}": ${message}`);
      return { category: null, skills: [] };
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
        { temperature: 0, responseFormat: "json" },
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
        { temperature: 0, responseFormat: "json" },
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
