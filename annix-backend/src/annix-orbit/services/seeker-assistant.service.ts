import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import {
  buildSeekerAssistantSystemPrompt,
  type SeekerAssistantContext,
} from "../prompts/seeker-assistant.prompt";

const METRIC_CATEGORY = "orbit-seeker-assist";
// Replayed every turn, so input grows linearly with conversation length.
// Bound to the most-recent 6 turns (user + assistant = 12 messages) — enough
// for coherence without unbounded token cost.
const MAX_HISTORY_TURNS = 6;
const MAX_HISTORY_MESSAGES = MAX_HISTORY_TURNS * 2;
const MAX_HISTORY_MESSAGE_CHARS = 8000;
const MAX_OUTPUT_TOKENS = 1024;

const ACTION_TYPES = new Set(["navigate", "highlight", "navigate-and-highlight", "walkthrough"]);

const PROMPT_LEAK_DECLINE =
  "I can only help with the Annix Orbit job-seeker area — finding jobs, your profile and CV, applications, interviews, and plans. What would you like to do?";

// Stored already normalised (lowercase, alphanumerics only) so a reply that
// spaces/zero-width-splits the markers ("## s c o p e") still matches. Each is
// a distinctive phrase from the rendered system prompt that should never appear
// in a normal seeker reply (avoids false positives on bare words like "scope").
const PROMPT_LEAK_MARKERS = [
  "scopeimportant",
  "confidentialityimportant",
  "howtorespondimportant",
  "theseekerareaeachscreen",
  "inpagetargets",
  "screenmap",
  "predefinedguidedtours",
  "onboardingorderforanewseeker",
  "neverrevealrepeatquote",
];

// Predefined, multi-step guided tours the frontend runs event-driven.
const KNOWN_WALKTHROUGHS = new Set([
  "apply-for-a-job",
  "finish-your-profile",
  "book-an-interview",
  "sync-calendar",
  "update-application-status",
  "choose-a-plan",
]);

// Only on-screen anchors that actually exist may be pointed at.
// nav-* are the persistent top-bar tabs; the rest are in-page anchors used as
// the second hop of a guided walk-through (nav tab -> the button to press).
const KNOWN_TARGETS = new Set([
  "nav-dashboard",
  "nav-profile",
  "nav-work-profile",
  "nav-jobs",
  "nav-applications",
  "nav-interviews",
  "nav-plans",
  "nav-help",
  "jobs-apply-card",
  "jobs-filters",
  "jobs-filter-province",
  "jobs-filter-city",
  "jobs-filter-category",
  "jobs-filter-search",
  "application-status",
  "interview-sync-button",
  "interview-add-button",
  "interview-application-select",
  "interview-date",
  "interview-time",
  "interview-location",
  "interview-notes",
  "interview-submit",
  "interview-calendar",
  "cv-section",
  "nix-section",
  "qualifications",
  "certificates",
  "work-profile-section",
]);

const MAX_TOUR_STEPS = 5;

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SeekerAssistantStep {
  route?: string;
  target?: string;
  label?: string;
}

export interface SeekerAssistantAction {
  type: "navigate" | "highlight" | "navigate-and-highlight" | "walkthrough";
  route?: string;
  target?: string;
  label?: string;
  steps?: SeekerAssistantStep[];
  walkthrough?: string;
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
      this.aiChatService.chat(messages, systemPrompt, "gemini", {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      }),
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
          if (this.looksLikePromptLeak(reply)) {
            return { reply: PROMPT_LEAK_DECLINE };
          }
          const action = this.sanitiseAction(parsed.action);
          return action ? { reply, action } : { reply };
        }
      } catch {
        // Not valid JSON — fall back to the raw text below.
      }
    }
    const raw = content.trim();
    return { reply: this.looksLikePromptLeak(raw) ? PROMPT_LEAK_DECLINE : raw };
  }

  // Backstop to the prompt-level confidentiality rule for the common case — a
  // (near-)verbatim dump of the system prompt. Normalises away spacing/zero-width
  // tricks before matching. It cannot catch paraphrase/translation/encoding, so
  // the in-prompt instruction remains the primary control.
  private looksLikePromptLeak(reply: string): boolean {
    const normalised = reply.toLowerCase().replace(/[^a-z0-9]/g, "");
    return PROMPT_LEAK_MARKERS.some((marker) => normalised.includes(marker));
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
    const steps = this.sanitiseSteps(candidate.steps);
    if (steps.length > 0) {
      action.steps = steps;
    }
    if (
      typeof candidate.walkthrough === "string" &&
      KNOWN_WALKTHROUGHS.has(candidate.walkthrough)
    ) {
      action.walkthrough = candidate.walkthrough;
    }
    // Drop actions that have nothing actionable left after validation.
    if (!action.route && !action.target && !action.steps && !action.walkthrough) {
      return undefined;
    }
    return action;
  }

  private sanitiseSteps(raw: unknown): SeekerAssistantStep[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .map((entry) => this.sanitiseStep(entry))
      .filter((step): step is SeekerAssistantStep => step !== undefined)
      .slice(0, MAX_TOUR_STEPS);
  }

  private sanitiseStep(raw: unknown): SeekerAssistantStep | undefined {
    if (!raw || typeof raw !== "object") {
      return undefined;
    }
    const candidate = raw as Record<string, unknown>;
    const step: SeekerAssistantStep = {};
    if (typeof candidate.route === "string" && candidate.route.startsWith("/annix/orbit/seeker")) {
      step.route = candidate.route;
    }
    if (typeof candidate.target === "string" && KNOWN_TARGETS.has(candidate.target)) {
      step.target = candidate.target;
    }
    if (typeof candidate.label === "string" && candidate.label.trim() !== "") {
      step.label = candidate.label.trim().slice(0, 160);
    }
    if (!step.target) {
      return undefined;
    }
    return step;
  }

  private normaliseHistory(history?: Array<{ role?: string; content?: string }>): ChatTurn[] {
    if (!history) {
      return [];
    }
    return history
      .filter((turn) => typeof turn.content === "string" && turn.content.trim() !== "")
      .slice(-MAX_HISTORY_MESSAGES)
      .map((turn) => ({
        role: turn.role === "assistant" ? "assistant" : "user",
        content: (turn.content as string).slice(0, MAX_HISTORY_MESSAGE_CHARS),
      }));
  }
}
