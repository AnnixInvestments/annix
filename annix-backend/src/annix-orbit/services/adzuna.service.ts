import { Injectable, Logger } from "@nestjs/common";
import { DateTime, nowMillis } from "../../lib/datetime";
import { stripHtmlToText } from "../../lib/html-text";
import { IngestedJobResult } from "./ingested-job.types";

export type AdzunaJobResult = IngestedJobResult;

interface AdzunaApiResponse {
  results: Array<{
    id: string;
    title: string;
    company?: { display_name?: string };
    description?: string;
    location?: { display_name?: string; area?: string[] };
    salary_min?: number;
    salary_max?: number;
    category?: { label?: string; tag?: string };
    redirect_url?: string;
    created?: string;
  }>;
  count: number;
}

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";
const ADZUNA_OUTAGE_MS = 30 * 60 * 1000;
const ADZUNA_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

@Injectable()
export class AdzunaService {
  private readonly logger = new Logger(AdzunaService.name);
  private unavailableUntilMs = 0;

  async searchJobs(
    appId: string,
    appKey: string,
    country: string,
    options: {
      category?: string;
      keywords?: string;
      locationArea?: string;
      page?: number;
      resultsPerPage?: number;
      maxDaysOld?: number;
    } = {},
  ): Promise<{ jobs: AdzunaJobResult[]; totalCount: number }> {
    const page = options.page ?? 1;
    const resultsPerPage = options.resultsPerPage ?? 50;

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: String(resultsPerPage),
    });

    if (options.keywords) {
      params.set("what", options.keywords);
    }
    if (options.locationArea) {
      params.set("where", options.locationArea);
    }
    if (options.category) {
      params.set("category", options.category);
    }
    if (options.maxDaysOld) {
      params.set("max_days_old", String(options.maxDaysOld));
    }

    const url = `${ADZUNA_BASE_URL}/${country}/search/${page}?${params.toString()}`;

    this.assertAvailable();

    const response = await fetch(url);

    if (!response.ok) {
      const message = await this.describeError(response);
      this.recordRetryableFailure(response.status);
      this.logger.error(message);
      throw new Error(message);
    }

    const data: AdzunaApiResponse = await response.json();

    const jobs = data.results.map((result) => this.mapResult(result));

    return { jobs, totalCount: data.count };
  }

  /**
   * Phase 5b: aggregate salary data for a given title + province by sampling
   * recent Adzuna postings. Returns p25 / p50 / p75 / sampleSize so we can
   * cache it under cv_assistant_salary_benchmarks.
   *
   * Calls into the standard Adzuna search endpoint; salaries are extracted
   * from each result's salary_min / salary_max midpoint and quantiles are
   * computed locally. Anything below 5 results returns sampleSize=0 so the
   * caller knows to fall back to Nix narration.
   */
  async salaryAggregates(
    appId: string,
    appKey: string,
    country: string,
    options: {
      title: string;
      province?: string | null;
      maxDaysOld?: number;
      maxPages?: number;
    },
  ): Promise<{
    p25: number | null;
    p50: number | null;
    p75: number | null;
    sampleSize: number;
  }> {
    const maxPages = options.maxPages ?? 2;
    const maxDaysOld = options.maxDaysOld ?? 60;
    const collected: number[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const { jobs } = await this.searchJobs(appId, appKey, country, {
        keywords: options.title,
        locationArea: options.province ?? undefined,
        page,
        resultsPerPage: 50,
        maxDaysOld,
      });
      if (jobs.length === 0) break;
      for (const job of jobs) {
        const min = job.salaryMin;
        const max = job.salaryMax;
        if (min != null && max != null) {
          collected.push((min + max) / 2);
        } else if (min != null) {
          collected.push(min);
        } else if (max != null) {
          collected.push(max);
        }
      }
      if (jobs.length < 50) break;
    }

    if (collected.length < 5) {
      return { p25: null, p50: null, p75: null, sampleSize: collected.length };
    }

    const sorted = [...collected].sort((a, b) => a - b);
    const quantile = (q: number): number => {
      const pos = (sorted.length - 1) * q;
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      const lower = sorted[lo];
      const upper = sorted[hi];
      if (lo === hi) return lower;
      return lower + (upper - lower) * (pos - lo);
    };

    return {
      p25: Math.round(quantile(0.25)),
      p50: Math.round(quantile(0.5)),
      p75: Math.round(quantile(0.75)),
      sampleSize: sorted.length,
    };
  }

  async categories(
    appId: string,
    appKey: string,
    country: string,
  ): Promise<Array<{ tag: string; label: string }>> {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
    });

    const url = `${ADZUNA_BASE_URL}/${country}/categories?${params.toString()}`;
    this.assertAvailable();

    const response = await fetch(url);

    if (!response.ok) {
      const message = await this.describeError(response);
      this.recordRetryableFailure(response.status);
      this.logger.error(message);
      return [];
    }

    const data = await response.json();
    return (data.results ?? []).map((cat: { tag: string; label: string }) => ({
      tag: cat.tag,
      label: cat.label,
    }));
  }

  private mapResult(result: AdzunaApiResponse["results"][number]): AdzunaJobResult {
    const areaArray = result.location?.area ?? [];
    const locationArea =
      areaArray.length > 1 ? areaArray[areaArray.length - 1] : (areaArray[0] ?? null);

    return {
      id: String(result.id),
      title: result.title ?? "",
      company: result.company?.display_name ?? null,
      description: stripHtmlToText(result.description ?? null),
      locationDisplayName: result.location?.display_name ?? null,
      locationArea,
      salaryMin: result.salary_min ?? null,
      salaryMax: result.salary_max ?? null,
      category: result.category?.tag ?? null,
      redirectUrl: result.redirect_url ?? null,
      created: result.created ?? null,
    };
  }

  estimateExpiry(postedDate: string | null): Date | null {
    if (!postedDate) {
      return null;
    }
    const posted = DateTime.fromISO(postedDate);
    if (!posted.isValid) {
      return null;
    }
    return posted.plus({ days: 30 }).toJSDate();
  }

  private assertAvailable(): void {
    if (nowMillis() < this.unavailableUntilMs) {
      throw new Error("Adzuna API is temporarily unavailable. Ingestion will retry shortly.");
    }
  }

  private recordRetryableFailure(status: number): void {
    if (ADZUNA_RETRYABLE_STATUSES.has(status)) {
      this.unavailableUntilMs = nowMillis() + ADZUNA_OUTAGE_MS;
    }
  }

  private async describeError(response: Response): Promise<string> {
    const status = response.status;
    const body = await response.text().catch(() => "");

    if (status === 429) {
      return "Adzuna API rate limit reached (HTTP 429). Ingestion will retry on the next scheduled run.";
    }

    if ([500, 502, 503, 504].includes(status)) {
      return `Adzuna API is temporarily unavailable (HTTP ${status}). Existing jobs remain available; ingestion will retry on the next scheduled run.`;
    }

    const text = (stripHtmlToText(body) ?? "").replace(/\s+/g, " ").trim();
    const detail = text.length > 220 ? `${text.slice(0, 217)}...` : text;
    return detail ? `Adzuna API returned ${status}: ${detail}` : `Adzuna API returned ${status}`;
  }
}
