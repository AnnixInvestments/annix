import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import {
  buildSeekerAssistantSystemPrompt,
  type SeekerAssistantContext,
} from "../prompts/seeker-assistant.prompt";

const METRIC_CATEGORY = "orbit-seeker-assist";
const MAX_HISTORY = 12;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SeekerAssistantReply {
  reply: string;
}

export interface SeekerAssistantChatInput {
  message: string;
  history?: Array<{ role?: string; content?: string }>;
  context?: SeekerAssistantContext;
}

@Injectable()
export class SeekerAssistantService {
  private readonly logger = new Logger(SeekerAssistantService.name);

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly metrics: ExtractionMetricService,
  ) {}

  async chat(seekerId: number, input: SeekerAssistantChatInput): Promise<SeekerAssistantReply> {
    if (!(await this.aiChatService.isAvailable())) {
      throw new ServiceUnavailableException("The assistant is unavailable right now.");
    }

    const history = this.normaliseHistory(input.history);
    const messages: ChatTurn[] = [...history, { role: "user", content: input.message }];
    const systemPrompt = buildSeekerAssistantSystemPrompt(input.context);

    const { content } = await this.metrics.time(METRIC_CATEGORY, "chat", () =>
      this.aiChatService.chat(messages, systemPrompt, "gemini"),
    );

    this.logger.log(`Seeker assistant replied to seeker ${seekerId}`);
    return { reply: content.trim() };
  }

  private normaliseHistory(history?: Array<{ role?: string; content?: string }>): ChatTurn[] {
    if (!history) {
      return [];
    }
    return history
      .filter((turn) => typeof turn.content === "string" && turn.content.trim() !== "")
      .slice(-MAX_HISTORY)
      .map((turn) => ({
        role: turn.role === "assistant" ? "assistant" : "user",
        content: turn.content as string,
      }));
  }
}
