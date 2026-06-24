import { Injectable, Logger } from "@nestjs/common";
import { safeFetch } from "../../lib/safe-outbound-fetch";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";

export interface CompanyResearchResult {
  companySummary: string | null;
  inferredBullets: string[];
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_SITE_CHARS = 15_000;
const MAX_OUTPUT_TOKENS = 512;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

@Injectable()
export class SeekerCompanyResearchService {
  private readonly logger = new Logger(SeekerCompanyResearchService.name);

  constructor(
    private readonly aiChatService: AiChatService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {}

  async research(
    url: string | null,
    roleTitle: string,
    roleOutline: string | null,
  ): Promise<CompanyResearchResult | null> {
    if (!url || !isHttpUrl(url)) return null;
    return this.extractionMetricService.time("orbit-company-research", "employment", () =>
      this.runResearch(url, roleTitle, roleOutline),
    );
  }

  private async runResearch(
    url: string,
    roleTitle: string,
    roleOutline: string | null,
  ): Promise<CompanyResearchResult | null> {
    const siteText = await this.fetchSiteText(url);
    if (!siteText) return null;
    try {
      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: buildResearchPrompt(siteText, roleTitle, roleOutline) }],
        researchSystemPrompt(),
        "gemini",
        { maxOutputTokens: MAX_OUTPUT_TOKENS, thinkingBudget: 0 },
      );
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]) as {
        companySummary?: unknown;
        inferredBullets?: unknown;
      };
      const companySummary =
        typeof parsed.companySummary === "string" ? parsed.companySummary : null;
      const inferredBullets = Array.isArray(parsed.inferredBullets)
        ? parsed.inferredBullets
            .filter((bullet): bullet is string => typeof bullet === "string")
            .map((bullet) => bullet.trim())
            .filter((bullet) => bullet.length > 0)
            .slice(0, 6)
        : [];
      return { companySummary, inferredBullets };
    } catch (err) {
      this.logger.warn(
        `Company research failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  private async fetchSiteText(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await safeFetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "AnnixOrbit/1.0 (+https://annix.co.za)" },
      });
      if (!response.ok) return null;
      const html = await response.text();
      const text = stripHtml(html);
      if (text.length === 0) return null;
      return text.length > MAX_SITE_CHARS ? text.slice(0, MAX_SITE_CHARS) : text;
    } catch (err) {
      this.logger.warn(
        `Company site fetch failed for ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function researchSystemPrompt(): string {
  return `You research a company from text scraped off its website, to help a job seeker describe a role they have just started there on their CV.

Return ONLY JSON in this exact shape (no markdown):
{
  "companySummary": string,
  "inferredBullets": string[]
}

Rules:
- "companySummary": one or two plain-English sentences describing what the company does and its sector. If the text is too thin to tell, return an empty string.
- "inferredBullets": 3-5 concise, CV-ready responsibility/achievement bullets for the seeker's stated role at this company, grounded in what the company does. Do NOT invent specific metrics, client names, or facts not supported by the text or the role outline. Keep each bullet under 22 words.
- Never fabricate. If unsure, keep bullets generic to the role rather than inventing company specifics.`;
}

function buildResearchPrompt(
  siteText: string,
  roleTitle: string,
  roleOutline: string | null,
): string {
  const outline =
    roleOutline && roleOutline.trim().length > 0 ? roleOutline.trim() : "(not provided)";
  return `The seeker has just started the role "${roleTitle}".
Their own outline of the role: ${outline}

Company website text:
${siteText}

Return ONLY the JSON object.`;
}
