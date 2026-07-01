import type { AgeBucket, DifficultyLevel, Subject } from "@annix/product-data/teacher-assistant";
import { Injectable, Logger } from "@nestjs/common";
import { AiApp } from "../../ai-usage/entities/ai-usage-log.entity";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { parseAiJson } from "../../nix/ai-providers/ai-json";

const METRIC_CATEGORY = "teacher-assistant-suggest";
const SYSTEM_PROMPT = `You are an expert education designer who writes concise learning objectives.
Each objective is one sentence, starts with a verb (Identify, Compare, Explain, Predict, Investigate, Design, Evaluate), and is measurable.
Match the age and difficulty given. Return STRICT JSON only — an object with a "suggestions" array of 4 strings, no extra text.`;

export interface SuggestObjectivesInput {
  subject: Subject;
  topic: string;
  ageBucket: AgeBucket;
  difficulty: DifficultyLevel;
}

interface AiSuggestionResponse {
  suggestions: string[];
}

@Injectable()
export class ObjectiveSuggesterService {
  private readonly logger = new Logger(ObjectiveSuggesterService.name);

  constructor(
    private readonly aiChat: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async suggest(input: SuggestObjectivesInput): Promise<string[]> {
    return this.metrics.time(METRIC_CATEGORY, input.subject, async () => {
      const userPrompt = this.buildPrompt(input);
      const response = await this.aiChat.chat(
        [{ role: "user", content: userPrompt }],
        SYSTEM_PROMPT,
        "gemini",
        undefined,
        { app: AiApp.TEACHER_ASSISTANT, actionType: "teacher-suggest-objectives" },
      );
      const parsed = parseAiJson<AiSuggestionResponse>(response.content, { repair: true });
      const suggestions = (parsed.suggestions ?? [])
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0)
        .slice(0, 6);
      if (suggestions.length === 0) {
        this.logger.warn(
          `Objective suggester returned no usable suggestions for ${input.subject}/${input.topic}`,
        );
      }
      return suggestions;
    });
  }

  private buildPrompt(input: SuggestObjectivesInput): string {
    return [
      `Suggest 4 distinct learning objectives for a ${input.subject} assignment on "${input.topic}".`,
      `Student age bucket: ${input.ageBucket}.`,
      `Difficulty: ${input.difficulty}.`,
      "Each objective must:",
      "- Be exactly one sentence",
      "- Start with a measurable verb (Identify, Compare, Explain, Predict, Investigate, Design, Evaluate)",
      "- Be specific to the topic, not generic",
      "- Be achievable in a single classroom assignment",
      "",
      'Return JSON in the form { "suggestions": ["...", "...", "...", "..."] } and nothing else.',
    ].join("\n");
  }
}
