import {
  isJobCategoryKey,
  JOB_CATEGORIES,
  type JobCategoryKey,
  matchJobCategoryRuleBased,
  OTHER_JOB_CATEGORY,
} from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

export interface JobCategorizationInput {
  title?: string | null;
  providerCategory?: string | null;
  description?: string | null;
}

interface AiCategoryResponse {
  category?: string;
}

const ALLOWED_KEYS = JOB_CATEGORIES.map((category) => `${category.key} (${category.label})`).join(
  "\n",
);

const SYSTEM_PROMPT = `You classify South African job listings into exactly one category.
Respond ONLY with JSON: {"category": "<key>"} where <key> is one of these exact keys:
${ALLOWED_KEYS}

Pick the single best fit. If nothing fits, use "other". Never invent a key.`;

@Injectable()
export class JobCategorizationService {
  private readonly logger = new Logger(JobCategorizationService.name);
  private readonly aiCache = new Map<string, JobCategoryKey>();

  constructor(private readonly aiChatService: AiChatService) {}

  ruleBased(input: JobCategorizationInput): JobCategoryKey | null {
    return matchJobCategoryRuleBased(input);
  }

  async categorize(input: JobCategorizationInput): Promise<JobCategoryKey> {
    const ruled = matchJobCategoryRuleBased(input);
    if (ruled) return ruled;
    const aiKey = await this.categorizeWithAi(input);
    return aiKey ?? OTHER_JOB_CATEGORY;
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
