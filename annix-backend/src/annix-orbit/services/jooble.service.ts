import { Injectable, Logger } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { stripHtmlToText } from "../../lib/html-text";
import { IngestedJobResult } from "./ingested-job.types";

interface JoobleApiResponse {
  totalCount?: number;
  jobs?: Array<{
    id?: number | string;
    title?: string;
    location?: string;
    snippet?: string;
    salary?: string;
    source?: string;
    type?: string;
    link?: string;
    company?: string;
    updated?: string;
  }>;
}

const JOOBLE_BASE_URL = "https://jooble.org/api";
const JOOBLE_DEFAULT_LOCATION = "South Africa";
const JOOBLE_PAGE_SIZE = 50;
const JOOBLE_MAX_PAGES = 5;
const JOOBLE_TARGET = 200;

// Jooble's `location` is free-text; map a source country code to the country name
// it expects so a Jooble-gb source searches UK jobs.
const JOOBLE_LOCATION_BY_COUNTRY: Record<string, string> = {
  za: "South Africa",
  gb: "United Kingdom",
};

export function joobleLocationForCountry(country: string | null | undefined): string {
  if (!country) return JOOBLE_DEFAULT_LOCATION;
  return JOOBLE_LOCATION_BY_COUNTRY[country.toLowerCase()] ?? JOOBLE_DEFAULT_LOCATION;
}

@Injectable()
export class JoobleService {
  private readonly logger = new Logger(JoobleService.name);

  async searchJobs(
    apiKey: string,
    options: { keywords?: string; resultsPerPage?: number; location?: string } = {},
  ): Promise<{ jobs: IngestedJobResult[]; totalCount: number }> {
    const target = options.resultsPerPage ?? JOOBLE_TARGET;
    const location = options.location ?? JOOBLE_DEFAULT_LOCATION;
    const seenIds = new Set<string>();
    const collected: IngestedJobResult[] = [];

    for (let page = 1; page <= JOOBLE_MAX_PAGES; page += 1) {
      if (collected.length >= target) break;

      const response = await fetch(`${JOOBLE_BASE_URL}/${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          keywords: options.keywords ?? "",
          location,
          page: String(page),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Jooble API error ${response.status} on page ${page}: ${errorText}`);
        throw new Error(`Jooble API returned ${response.status}: ${errorText}`);
      }

      const data: JoobleApiResponse = await response.json();
      const rawJobs = data.jobs ?? [];
      if (rawJobs.length === 0) break;

      const fresh = rawJobs.filter((job) => {
        const key = String(job.id ?? job.link ?? "");
        if (key.length === 0 || seenIds.has(key)) return false;
        seenIds.add(key);
        return true;
      });
      if (fresh.length === 0) break;

      collected.push(...fresh.map((job) => this.mapResult(job)));

      if (rawJobs.length < JOOBLE_PAGE_SIZE) break;
    }

    const jobs = collected.slice(0, target);
    return { jobs, totalCount: jobs.length };
  }

  private mapResult(result: NonNullable<JoobleApiResponse["jobs"]>[number]): IngestedJobResult {
    const salary = parseJoobleSalary(result.salary ?? null);
    const location = result.location ?? null;
    const posted = result.updated ? DateTime.fromISO(result.updated) : null;
    const created = posted?.isValid ? posted.toISO() : null;
    return {
      id: String(result.id ?? result.link ?? ""),
      title: result.title ?? "",
      company: result.company ?? null,
      description: stripHtmlToText(result.snippet ?? null),
      locationDisplayName: location,
      locationArea: location,
      salaryMin: salary.min,
      salaryMax: salary.max,
      category: null,
      redirectUrl: result.link ?? null,
      created,
    };
  }
}

function parseJoobleSalary(raw: string | null): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null };
  const numbers = raw.match(/\d[\d\s.,]*/g);
  if (!numbers || numbers.length === 0) return { min: null, max: null };
  const cleaned = numbers
    .map((n) => Number.parseFloat(n.replace(/[\s,]/g, "")))
    .filter((n) => !Number.isNaN(n));
  if (cleaned.length === 0) return { min: null, max: null };
  if (cleaned.length === 1) return { min: cleaned[0], max: null };
  return { min: Math.min(...cleaned), max: Math.max(...cleaned) };
}
