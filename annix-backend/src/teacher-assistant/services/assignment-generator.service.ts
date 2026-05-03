import { createHash } from "node:crypto";
import {
  type Assignment,
  type AssignmentInput,
  type AssignmentSection,
  buildRetryPrompt,
  buildSectionRegeneratePrompt,
  buildUserPrompt,
  isTooFluffy,
  SYSTEM_PROMPT,
  type ValidationFailure,
  validateAssignment,
} from "@annix/product-data/teacher-assistant";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

const METRIC_CATEGORY = "teacher-assistant-generate";
const MAX_RETRIES = 2;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  assignment: Assignment;
  storedAt: number;
}

@Injectable()
export class AssignmentGeneratorService {
  private readonly logger = new Logger(AssignmentGeneratorService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly aiChat: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async generate(input: AssignmentInput): Promise<Assignment> {
    const cacheKey = this.cacheKeyFor(input);
    const cached = this.cachedAssignment(cacheKey);
    if (cached) {
      this.logger.log(`Cache hit for ${input.subject}/${input.topic}`);
      return cached;
    }

    const result = await this.metrics.time(METRIC_CATEGORY, input.subject, () =>
      this.generateWithRetries(input),
    );

    this.cache.set(cacheKey, { assignment: result, storedAt: Date.now() });
    return result;
  }

  async regenerateSection(
    input: AssignmentInput,
    section: AssignmentSection,
    existingAssignment: Assignment,
  ): Promise<Assignment> {
    const prompt = buildSectionRegeneratePrompt(input, section, JSON.stringify(existingAssignment));
    const response = await this.aiChat.chat(
      [{ role: "user", content: prompt }],
      SYSTEM_PROMPT,
      "gemini",
    );
    const partial = parseJsonFromAi<Partial<Assignment>>(response.content);
    const merged: Assignment = {
      ...existingAssignment,
      ...partial,
    };
    const validation = validateAssignment(merged);
    if (!validation.valid) {
      this.logger.warn(
        `Section regenerate produced invalid assignment: ${this.summariseFailures(validation.failures)}`,
      );
      throw new BadRequestException({
        message: "Section regeneration failed validation.",
        failures: validation.failures,
      });
    }
    return merged;
  }

  private async generateWithRetries(input: AssignmentInput): Promise<Assignment> {
    let attempt = 0;
    let lastFailures: ValidationFailure[] = [];
    let lastFluffyFailures: ValidationFailure[] = [];

    while (attempt <= MAX_RETRIES) {
      const prompt =
        attempt === 0
          ? buildUserPrompt(input)
          : buildRetryPrompt(input, [
              ...lastFailures.map((f) => f.message),
              ...lastFluffyFailures.map((f) => f.message),
            ]);

      const response = await this.aiChat.chat(
        [{ role: "user", content: prompt }],
        SYSTEM_PROMPT,
        "gemini",
      );

      let assignment: Assignment;
      try {
        assignment = parseJsonFromAi<Assignment>(response.content);
      } catch (error) {
        lastFailures = [
          {
            code: "invalid_json",
            message: error instanceof Error ? error.message : String(error),
          },
        ];
        attempt += 1;
        continue;
      }

      const validation = validateAssignment(assignment);
      const fluffy = isTooFluffy(assignment);

      if (validation.valid && fluffy.valid) {
        return assignment;
      }

      lastFailures = validation.failures;
      lastFluffyFailures = fluffy.failures;
      this.logger.warn(
        `Attempt ${attempt + 1} failed: ${this.summariseFailures([
          ...validation.failures,
          ...fluffy.failures,
        ])}`,
      );
      attempt += 1;
    }

    throw new BadRequestException({
      message: `Generation failed after ${MAX_RETRIES + 1} attempts.`,
      failures: [...lastFailures, ...lastFluffyFailures],
    });
  }

  private summariseFailures(failures: ValidationFailure[]): string {
    return failures.map((f) => `[${f.code}] ${f.message}`).join("; ");
  }

  private cacheKeyFor(input: AssignmentInput): string {
    const canonical = JSON.stringify({
      subject: input.subject,
      topic: input.topic.toLowerCase().trim(),
      ageBucket: input.ageBucket,
      studentAge: input.studentAge,
      duration: input.duration,
      outputType: input.outputType,
      difficulty: input.difficulty,
      differentiation: [...input.differentiation].sort(),
      learningObjective: input.learningObjective?.trim() ?? null,
      allowAiUse: input.allowAiUse,
    });
    return createHash("sha256").update(canonical).digest("hex");
  }

  private cachedAssignment(key: string): Assignment | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.storedAt > CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.assignment;
  }
}
