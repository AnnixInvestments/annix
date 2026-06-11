import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { stripHtmlToText } from "../../lib/html-text";
import { IngestedJobResult } from "./ingested-job.types";

interface CareerjetApiResponse {
  type?: string;
  hits?: number;
  pages?: number;
  jobs?: Array<{
    title?: string;
    company?: string;
    date?: string;
    description?: string;
    locations?: string;
    salary_min?: number;
    salary_max?: number;
    url?: string;
  }>;
}

const CAREERJET_BASE_URL = "https://search.api.careerjet.net/v4/query";
const CAREERJET_LOCALE = "en_ZA";
const CAREERJET_PAGE_SIZE = 100;
const CAREERJET_MAX_PAGES = 5;
const CAREERJET_TARGET = 200;
const CAREERJET_USER_IP = "196.10.52.1";
const CAREERJET_USER_AGENT = "AnnixOrbitJobBot/1.0 (+https://annix.co.za)";
const CAREERJET_REFERER = "https://annix.co.za";
const CAREERJET_SWEEP_PAGES = 2;
const CAREERJET_SWEEP_KEYWORDS = [
  "engineering",
  "information technology",
  "finance",
  "accounting",
  "sales",
  "administration",
  "construction",
  "mining",
  "manufacturing",
  "logistics",
  "healthcare",
  "management",
  "human resources",
  "marketing",
  "retail",
  "welder",
  "boilermaker",
  "fitter",
  "electrician",
  "artisan",
  "driver",
  "technician",
  "supervisor",
  "operator",
];

@Injectable()
export class CareerjetService {
  private readonly logger = new Logger(CareerjetService.name);

  async searchJobs(
    affiliateId: string,
    options: { keywords?: string; resultsPerPage?: number } = {},
  ): Promise<{ jobs: IngestedJobResult[]; totalCount: number }> {
    const target = options.resultsPerPage ?? CAREERJET_TARGET;
    const { jobs } = await this.fetchQuery(
      affiliateId,
      options.keywords ?? null,
      CAREERJET_MAX_PAGES,
      target,
    );
    return { jobs, totalCount: jobs.length };
  }

  // Sweep a broad set of category/trade keywords and merge the deduped results,
  // so we draw a far larger pool than a single broad query. Returns the request
  // count so the caller can charge it against the source's daily rate limit.
  async searchAcrossCategories(
    affiliateId: string,
  ): Promise<{ jobs: IngestedJobResult[]; requests: number }> {
    const perKeywordTarget = CAREERJET_PAGE_SIZE * CAREERJET_SWEEP_PAGES;
    const seen = new Set<string>();
    const collected: IngestedJobResult[] = [];
    let requests = 0;
    let successes = 0;
    let lastError: Error | null = null;

    for (const keyword of CAREERJET_SWEEP_KEYWORDS) {
      try {
        const { jobs, requests: used } = await this.fetchQuery(
          affiliateId,
          keyword,
          CAREERJET_SWEEP_PAGES,
          perKeywordTarget,
        );
        requests += used;
        successes += 1;
        for (const job of jobs) {
          if (!seen.has(job.id)) {
            seen.add(job.id);
            collected.push(job);
          }
        }
      } catch (error) {
        requests += 1;
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Careerjet sweep failed for "${keyword}": ${lastError.message}`);
        // 401/403 are account/IP-level — every other keyword will fail the same
        // way, so stop the sweep and surface the error rather than burning the
        // daily rate limit on 24 identical rejections.
        if (/\b40[13]\b|unauthorized/i.test(lastError.message)) {
          throw lastError;
        }
      }
    }

    // A single bad keyword shouldn't fail the whole run, but if every keyword
    // failed the source is genuinely broken — surface it so the admin sees why.
    if (successes === 0 && lastError) {
      throw lastError;
    }

    return { jobs: collected, requests };
  }

  private async fetchQuery(
    affiliateId: string,
    keywords: string | null,
    maxPages: number,
    target: number,
  ): Promise<{ jobs: IngestedJobResult[]; requests: number }> {
    const authHeader = `Basic ${Buffer.from(`${affiliateId}:`).toString("base64")}`;
    const collected: IngestedJobResult[] = [];
    let requests = 0;

    for (let page = 1; page <= maxPages; page += 1) {
      if (collected.length >= target) break;

      const params = new URLSearchParams({
        locale_code: CAREERJET_LOCALE,
        sort: "date",
        page: String(page),
        page_size: String(CAREERJET_PAGE_SIZE),
        user_ip: CAREERJET_USER_IP,
        user_agent: CAREERJET_USER_AGENT,
      });
      if (keywords) params.set("keywords", keywords);

      requests += 1;
      const response = await fetch(`${CAREERJET_BASE_URL}?${params.toString()}`, {
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          Referer: CAREERJET_REFERER,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Careerjet API error ${response.status} on page ${page}: ${errorText}`);
        throw new Error(`Careerjet API returned ${response.status}: ${errorText}`);
      }

      const data: CareerjetApiResponse = await response.json();
      if (data.type && data.type !== "JOBS") {
        this.logger.warn(
          `Careerjet returned type=${data.type} (no jobs) on page ${page} — check locale/location scoping`,
        );
        break;
      }
      const rawJobs = data.jobs ?? [];
      if (rawJobs.length === 0) break;

      collected.push(...rawJobs.map((job) => this.mapResult(job)));

      if (rawJobs.length < CAREERJET_PAGE_SIZE) break;
    }

    return { jobs: collected.slice(0, target), requests };
  }

  private mapResult(result: NonNullable<CareerjetApiResponse["jobs"]>[number]): IngestedJobResult {
    const url = result.url ?? null;
    const externalId = url
      ? createHash("sha1").update(url).digest("hex").slice(0, 32)
      : createHash("sha1")
          .update(`${result.title ?? ""}|${result.company ?? ""}`)
          .digest("hex")
          .slice(0, 32);
    const location = result.locations ?? null;
    const created = parseCareerjetDate(result.date ?? null);
    return {
      id: externalId,
      title: result.title ?? "",
      company: result.company ?? null,
      description: stripHtmlToText(result.description ?? null),
      locationDisplayName: location,
      locationArea: location,
      salaryMin: typeof result.salary_min === "number" ? result.salary_min : null,
      salaryMax: typeof result.salary_max === "number" ? result.salary_max : null,
      category: null,
      redirectUrl: url,
      created,
    };
  }
}

function parseCareerjetDate(raw: string | null): string | null {
  if (!raw) return null;
  const iso = DateTime.fromISO(raw);
  if (iso.isValid) return iso.toISO();
  const withoutWeekday = raw
    .replace(/^[A-Za-z]{3},?\s*/, "")
    .replace(/\b(GMT|UTC)\b/i, "+0000")
    .trim();
  const formatted = DateTime.fromFormat(withoutWeekday, "d MMM yyyy HH:mm:ss ZZZ");
  if (formatted.isValid) return formatted.toISO();
  const rfc = DateTime.fromRFC2822(raw);
  return rfc.isValid ? rfc.toISO() : null;
}
