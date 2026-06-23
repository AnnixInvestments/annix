import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { isNumber } from "es-toolkit/compat";
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
// Careerjet validates the calling IP - claiming a fake user_ip while calling
// from a different address gets rejected with 403 "Unauthorized access from
// IP x.x.x.x" (seen on test, 2026-06-12). Send the machine's real egress IP,
// discovered once at runtime, with CAREERJET_USER_IP as an env override.
const CAREERJET_EGRESS_IP_PROBE = "https://api.ipify.org";
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
  private cachedEgressIp: string | null = null;

  private async resolveUserIp(): Promise<string | null> {
    const configured = process.env.CAREERJET_USER_IP;
    if (configured) return configured;
    if (this.cachedEgressIp) return this.cachedEgressIp;
    try {
      const response = await fetch(CAREERJET_EGRESS_IP_PROBE, {
        signal: AbortSignal.timeout(5000),
      });
      const ip = (await response.text()).trim();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        this.cachedEgressIp = ip;
        return ip;
      }
    } catch (err) {
      this.logger.warn(
        `Could not discover egress IP for Careerjet user_ip: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    return null;
  }

  private readonly logger = new Logger(CareerjetService.name);

  private extractUnauthorizedIp(text: string): string | null {
    const match = text.match(/Unauthorized access from IP\s+(\d{1,3}(?:\.\d{1,3}){3})/i);
    return match ? match[1] : null;
  }

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
    let userIp = await this.resolveUserIp();

    const doFetch = (ip: string | null) => {
      const params = new URLSearchParams({
        locale_code: CAREERJET_LOCALE,
        sort: "date",
        page: "1",
        page_size: String(CAREERJET_PAGE_SIZE),
        user_agent: CAREERJET_USER_AGENT,
      });
      if (ip) params.set("user_ip", ip);
      if (keywords) params.set("keywords", keywords);
      return params;
    };

    const pages = Array.from({ length: maxPages }, (_, index) => index + 1);
    const outcome = await pages.reduce(
      async (accPromise, page) => {
        const acc = await accPromise;
        if (acc.stop || acc.jobs.length >= target) return acc;

        const params = doFetch(userIp);
        params.set("page", String(page));

        const fetchPage = (p: URLSearchParams) =>
          fetch(`${CAREERJET_BASE_URL}?${p.toString()}`, {
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
              Referer: CAREERJET_REFERER,
            },
          });

        let response = await fetchPage(params);
        let requests = acc.requests + 1;

        // Careerjet 403s with the calling IP it actually saw. Fly's NAT egress IP
        // can differ from the probed user_ip, so self-heal: adopt the IP from the
        // error body, cache it for subsequent pages/keywords, and retry once.
        if (response.status === 403) {
          const body = await response.text();
          const seenIp = this.extractUnauthorizedIp(body);
          if (seenIp && seenIp !== userIp && !process.env.CAREERJET_USER_IP) {
            this.logger.warn(`Careerjet 403 — adopting reported egress IP ${seenIp} and retrying`);
            this.cachedEgressIp = seenIp;
            userIp = seenIp;
            const retryParams = doFetch(userIp);
            retryParams.set("page", String(page));
            response = await fetchPage(retryParams);
            requests = acc.requests + 2;
          } else {
            this.logger.error(`Careerjet API error 403 on page ${page}: ${body}`);
            throw new Error(`Careerjet API returned 403: ${body}`);
          }
        }

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
          return { ...acc, requests, stop: true };
        }
        const rawJobs = data.jobs ?? [];
        if (rawJobs.length === 0) return { ...acc, requests, stop: true };

        return {
          jobs: [...acc.jobs, ...rawJobs.map((job) => this.mapResult(job))],
          requests,
          stop: rawJobs.length < CAREERJET_PAGE_SIZE,
        };
      },
      Promise.resolve({ jobs: [] as IngestedJobResult[], requests: 0, stop: false }),
    );

    return { jobs: outcome.jobs.slice(0, target), requests: outcome.requests };
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
      salaryMin: isNumber(result.salary_min) ? result.salary_min : null,
      salaryMax: isNumber(result.salary_max) ? result.salary_max : null,
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
