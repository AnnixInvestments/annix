import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  BoardMeetingActionItem,
  BoardMeetingMinutes,
} from "./entities/rubber-board-meeting.entity";

// AI generation for Board Meetings — structured minutes from a transcript, and
// a draft next-meeting agenda from past minutes. Uses the same Gemini path the
// rest of the app uses for document extraction (JSON response mode).
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export interface GeneratedAgenda {
  title: string;
  standingItems: string[];
  carriedForwardActions: string[];
  unresolvedMatters: string[];
  suggestedItems: string[];
  generatedAt: string;
}

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];

@Injectable()
export class RubberBoardMeetingAiService {
  private readonly logger = new Logger(RubberBoardMeetingAiService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY") || "";
    this.model = this.configService.get<string>("GEMINI_CHAT_MODEL") || "gemini-2.5-flash";
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  private async generateJson(systemPrompt: string, userContent: string): Promise<unknown> {
    if (!this.isConfigured()) {
      throw new Error("AI is not configured — set GEMINI_API_KEY");
    }
    const response = await fetch(`${GEMINI_URL}/${this.model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }, { text: userContent }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Gemini API ${response.status}: ${body.slice(0, 300)}`);
    }
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned no content");
    }
    return JSON.parse(text);
  }

  async generateMinutes(input: {
    title: string;
    meetingDate: string | null;
    transcript: string | null;
    providerSummary: string | null;
  }): Promise<BoardMeetingMinutes> {
    const systemPrompt = [
      "You are an experienced company secretary producing formal BOARD MEETING MINUTES.",
      "From the transcript and/or summary provided, extract a faithful, professional record.",
      "Do not invent facts. If a section has no content, return an empty array for it.",
      "Respond ONLY with JSON of this exact shape:",
      "{",
      '  "attendees": string[],',
      '  "apologies": string[],',
      '  "agendaItems": string[],',
      '  "decisions": string[],',
      '  "actionItems": [{ "description": string, "owner": string|null, "dueDate": string|null }],',
      '  "mattersArising": string[],',
      '  "risksAndCompliance": string[],',
      '  "financialHighlights": string[],',
      '  "nextSteps": string[]',
      "}",
    ].join("\n");

    const userContent = [
      `MEETING: ${input.title}`,
      input.meetingDate ? `DATE: ${input.meetingDate}` : "",
      input.providerSummary ? `\nPROVIDER SUMMARY:\n${input.providerSummary}` : "",
      input.transcript ? `\nTRANSCRIPT:\n${input.transcript}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const raw = (await this.generateJson(systemPrompt, userContent)) as Record<string, unknown>;
    const actionItems: BoardMeetingActionItem[] = Array.isArray(raw.actionItems)
      ? (raw.actionItems as Record<string, unknown>[])
          .filter((a) => a && typeof a === "object" && typeof a.description === "string")
          .map((a) => ({
            description: a.description as string,
            owner: typeof a.owner === "string" ? a.owner : null,
            dueDate: typeof a.dueDate === "string" ? a.dueDate : null,
          }))
      : [];

    return {
      attendees: asStringArray(raw.attendees),
      apologies: asStringArray(raw.apologies),
      agendaItems: asStringArray(raw.agendaItems),
      decisions: asStringArray(raw.decisions),
      actionItems,
      mattersArising: asStringArray(raw.mattersArising),
      risksAndCompliance: asStringArray(raw.risksAndCompliance),
      financialHighlights: asStringArray(raw.financialHighlights),
      nextSteps: asStringArray(raw.nextSteps),
      generatedAt: new Date().toISOString(),
    };
  }

  async generateAgenda(
    pastMeetings: { title: string; meetingDate: string | null; minutes: BoardMeetingMinutes }[],
  ): Promise<GeneratedAgenda> {
    const systemPrompt = [
      "You are a company secretary drafting the AGENDA for the NEXT board meeting,",
      "based on the minutes of recent past meetings provided.",
      "Carry forward any open/incomplete action items, surface unresolved matters,",
      "include standard standing items, and suggest items implied by recent decisions.",
      "Respond ONLY with JSON of this exact shape:",
      "{",
      '  "title": string,',
      '  "standingItems": string[],',
      '  "carriedForwardActions": string[],',
      '  "unresolvedMatters": string[],',
      '  "suggestedItems": string[]',
      "}",
    ].join("\n");

    const userContent = pastMeetings
      .map((m, i) =>
        [
          `--- Meeting ${i + 1}: ${m.title} (${m.meetingDate ?? "date unknown"}) ---`,
          `Decisions: ${m.minutes.decisions.join("; ") || "none"}`,
          `Action items: ${
            m.minutes.actionItems
              .map((a) => `${a.description}${a.owner ? ` [${a.owner}]` : ""}`)
              .join("; ") || "none"
          }`,
          `Matters arising: ${m.minutes.mattersArising.join("; ") || "none"}`,
          `Next steps: ${m.minutes.nextSteps.join("; ") || "none"}`,
        ].join("\n"),
      )
      .join("\n\n");

    const raw = (await this.generateJson(systemPrompt, userContent)) as Record<string, unknown>;
    return {
      title: typeof raw.title === "string" ? raw.title : "Board Meeting Agenda",
      standingItems: asStringArray(raw.standingItems),
      carriedForwardActions: asStringArray(raw.carriedForwardActions),
      unresolvedMatters: asStringArray(raw.unresolvedMatters),
      suggestedItems: asStringArray(raw.suggestedItems),
      generatedAt: new Date().toISOString(),
    };
  }
}
