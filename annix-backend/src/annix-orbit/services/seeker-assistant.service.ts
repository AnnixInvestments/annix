import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import {
  buildSeekerAssistantSystemPrompt,
  type SeekerAssistantContext,
} from "../prompts/seeker-assistant.prompt";

const METRIC_CATEGORY = "orbit-seeker-assist";
const MAX_HISTORY = 12;

const ACTION_TYPES = new Set(["navigate", "highlight", "navigate-and-highlight"]);

// Only on-screen anchors that actually exist may be pointed at.
const KNOWN_TARGETS = new Set([
  "nav-dashboard",
  "nav-profile",
  "nav-work-profile",
  "nav-jobs",
  "nav-applications",
  "nav-interviews",
  "nav-plans",
  "nav-help",
]);

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SeekerAssistantAction {
  type: "navigate" | "highlight" | "navigate-and-highlight";
  route?: string;
  target?: string;
  label?: string;
}

export interface SeekerAssistantReply {
  reply: string;
  action?: SeekerAssistantAction;
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
    return this.parseOutput(content);
  }

  private parseOutput(content: string): SeekerAssistantReply {
    const fenced = content.replace(/```(?:json)?/gi, "").trim();
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(fenced.slice(start, end + 1)) as {
          reply?: unknown;
          action?: unknown;
        };
        const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
        if (reply !== "") {
          const action = this.sanitiseAction(parsed.action);
          return action ? { reply, action } : { reply };
        }
      } catch {
        // Not valid JSON — fall back to the raw text below.
      }
    }
    return { reply: content.trim() };
  }

  private sanitiseAction(raw: unknown): SeekerAssistantAction | undefined {
    if (!raw || typeof raw !== "object") {
      return undefined;
    }
    const candidate = raw as Record<string, unknown>;
    const type = candidate.type;
    if (typeof type !== "string" || !ACTION_TYPES.has(type)) {
      return undefined;
    }
    const action: SeekerAssistantAction = { type: type as SeekerAssistantAction["type"] };
    if (typeof candidate.route === "string" && candidate.route.startsWith("/annix/orbit/seeker")) {
      action.route = candidate.route;
    }
    if (typeof candidate.target === "string" && KNOWN_TARGETS.has(candidate.target)) {
      action.target = candidate.target;
    }
    if (typeof candidate.label === "string" && candidate.label.trim() !== "") {
      action.label = candidate.label.trim().slice(0, 160);
    }
    // Drop actions that have nothing actionable left after validation.
    if (!action.route && !action.target) {
      return undefined;
    }
    return action;
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
