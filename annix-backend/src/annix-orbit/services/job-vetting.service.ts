import { Injectable, Logger } from "@nestjs/common";
import { parseJsonFromAi } from "../../lib/json-from-ai";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

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

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {}

  async vet(input: JobVettingInput): Promise<JobVettingResult> {
    return this.extractionMetricService.time("orbit-job-vetting", "single-job", async () =>
      this.runVet(input),
    );
  }

  private async runVet(input: JobVettingInput): Promise<JobVettingResult> {
    const userMessage = this.buildPrompt(input);

    try {
      const response = await this.aiChatService.chat(
        [{ role: "user", content: userMessage }],
        SYSTEM_PROMPT,
        undefined,
        { temperature: 0, responseFormat: "json" },
      );

      const parsed = parseJsonFromAi<AiVettingResponse>(response.content);
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
    const lines = [
      `Title: ${input.title}`,
      `Company: ${input.company ?? "(not provided)"}`,
      `Location field: ${input.locationRaw ?? "(not provided)"}`,
      "",
      "Description:",
      input.description ?? "(no description)",
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
