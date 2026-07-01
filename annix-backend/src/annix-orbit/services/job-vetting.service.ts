import { Injectable, Logger } from "@nestjs/common";
import { AiApp } from "../../ai-usage/entities/ai-usage-log.entity";
import { now } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { parseAiJson } from "../../nix/ai-providers/ai-json";

export interface JobVettingInput {
  title: string;
  company: string | null;
  locationRaw: string | null;
  description: string | null;
}

export interface JobVettingResult {
  acceptsZa: boolean | null;
  notes: string;
}

interface AiVettingResponse {
  acceptsSouthAfrica: boolean | null;
  restrictions: string[];
  explanation: string;
}

// Cheap model for the simple residency-eligibility decision. Override via env.
const VETTING_MODEL = process.env.ORBIT_CLASSIFIER_MODEL || "gemini-2.5-flash-lite";

// Residency/eligibility keywords sit near the top of a listing — a short prefix
// is enough to decide and keeps input tokens down.
const MAX_DESCRIPTION_CHARS = 1500;

// Daily ceiling on Gemini vetting calls so a runaway backfill/ingestion surge
// can't spike spend. Mirrors JobCategorizationService's dailyAnalysisCap.
// Override via env.
const DEFAULT_JOB_VETTING_DAILY_CAP = 3000;

const SYSTEM_PROMPT = `You are vetting remote job listings for a South African job board.

Your job is to decide whether a candidate **residing in South Africa** would be eligible to apply for the role, based purely on the residency/location requirements stated in the listing.

CRITICAL DISTINCTIONS:
- A company being **headquartered** in the US/EU/Israel/anywhere else is FINE. That alone does not disqualify a South African candidate.
- A role being **fully remote / remote-anywhere / remote-global / work-from-anywhere** is FINE. South African candidates can apply.
- A role becomes INELIGIBLE only when the listing explicitly requires the candidate to **live in, be based in, reside in, or be physically located in** a country/region that excludes South Africa.
- Phrases like "must be located in the Americas, Europe, or Israel", "candidates must reside in the US", "EU residents only", "must be based in [country]" → INELIGIBLE for SA residents.
- Phrases like "remote, US-friendly hours", "work from anywhere", "EMEA remote" → ELIGIBLE (EMEA includes Africa).
- Visa / work-authorization language is AMBIGUOUS. "Must be authorized to work in the US" could mean visa sponsorship is offered (eligible) or US-citizen-only (ineligible). When unclear, return null.
- Time-zone preferences (e.g. "must overlap with US Eastern hours") are NOT residency requirements — return true.

Return STRICT JSON, no prose, no markdown fences:
{
  "acceptsSouthAfrica": true | false | null,
  "restrictions": ["short phrase 1", "short phrase 2"],
  "explanation": "one sentence explaining the decision in plain English"
}

- true  = a South African resident can apply
- false = the listing explicitly excludes South African residents
- null  = ambiguous or unclear (default to null when in doubt)`;

@Injectable()
export class JobVettingService {
  private readonly logger = new Logger(JobVettingService.name);

  private aiCallsToday = 0;
  private aiCallsDate = "";
  private readonly dailyVettingCap = (() => {
    const raw = Number(process.env.ORBIT_JOB_VETTING_DAILY_CAP);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_JOB_VETTING_DAILY_CAP;
  })();

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {}

  // Reserves one slot against the daily vetting cap (reset each day). Returns
  // false once the cap is reached so callers skip the Gemini call.
  private consumeDailyVettingBudget(): boolean {
    const today = now().toISODate() ?? "";
    if (today !== this.aiCallsDate) {
      this.aiCallsDate = today;
      this.aiCallsToday = 0;
    }
    if (this.aiCallsToday >= this.dailyVettingCap) {
      return false;
    }
    this.aiCallsToday += 1;
    return true;
  }

  async vet(input: JobVettingInput): Promise<JobVettingResult> {
    return this.extractionMetricService.time("orbit-job-vetting", "single-job", async () =>
      this.runVet(input),
    );
  }

  private async runVet(input: JobVettingInput): Promise<JobVettingResult> {
    if (!this.consumeDailyVettingBudget()) {
      this.logger.warn(
        `Daily job-vetting cap (${this.dailyVettingCap}) reached — skipping AI vetting for "${input.title}"`,
      );
      return { acceptsZa: null, notes: "" };
    }

    const userMessage = this.buildPrompt(input);

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        SYSTEM_PROMPT,
        undefined,
        {
          temperature: 0,
          responseFormat: "json",
          thinkingBudget: 0,
          maxOutputTokens: 256,
          model: VETTING_MODEL,
        },
        { app: AiApp.ANNIX_ORBIT, actionType: "orbit-job-vetting" },
      );

      const parsed = parseAiJson<AiVettingResponse>(response.content, { repair: true });
      const notes = this.buildNotes(parsed);
      return {
        acceptsZa: this.coerceBoolean(parsed.acceptsSouthAfrica),
        notes,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Vetting failed for "${input.title}": ${message}`);
      return { acceptsZa: null, notes: "" };
    }
  }

  private buildPrompt(input: JobVettingInput): string {
    const description = (input.description ?? "").slice(0, MAX_DESCRIPTION_CHARS);
    const lines = [
      `Title: ${input.title}`,
      `Company: ${input.company ?? "(not provided)"}`,
      `Location field: ${input.locationRaw ?? "(not provided)"}`,
      "",
      "Description:",
      description.length > 0 ? description : "(no description)",
    ];
    return lines.join("\n");
  }

  private buildNotes(parsed: AiVettingResponse): string {
    const restrictions = parsed.restrictions
      ? parsed.restrictions.filter((r) => r && r.trim().length > 0)
      : [];
    const explanation = parsed.explanation ? parsed.explanation.trim() : "";
    if (restrictions.length === 0) return explanation;
    return `${explanation} (${restrictions.join("; ")})`.trim();
  }

  private coerceBoolean(value: boolean | null | undefined): boolean | null {
    if (value === true) return true;
    if (value === false) return false;
    return null;
  }
}
