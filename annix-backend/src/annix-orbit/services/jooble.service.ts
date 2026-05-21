import { Injectable, Logger } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { stripHtmlToText } from "../../lib/html-text";
import { IngestedJobResult } from "./ingested-job.types";

interface JoobleApiResponse {
  totalCount: number;
  jobs: Array<{
    id: number | string;
    title: string;
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

@Injectable()
export class JoobleService {
  private readonly logger = new Logger(JoobleService.name);

  async searchJobs(
    apiKey: string,
    options: {
      keywords?: string;
      location?: string;
      page?: number;
      resultsPerPage?: number;
      searchMode?: number;
      salary?: number;
      dateCreatedFrom?: string;
    } = {},
  ): Promise<{ jobs: IngestedJobResult[]; totalCount: number }> {
    const body: Record<string, unknown> = {
      keywords: options.keywords ?? "",
      location: options.location ?? "",
      page: String(options.page ?? 1),
      ResultOnPage: String(options.resultsPerPage ?? 20),
    };
    if (options.searchMode != null) {
      body.searchMode = options.searchMode;
    }
    if (options.salary != null) {
      body.salary = options.salary;
    }
    if (options.dateCreatedFrom) {
      body.datecreatedfrom = options.dateCreatedFrom;
    }

    const url = `${JOOBLE_BASE_URL}/${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Jooble API error ${response.status}: ${errorText}`);
      throw new Error(`Jooble API returned ${response.status}: ${errorText}`);
    }

    const data: JoobleApiResponse = await response.json();
    const jobs = (data.jobs ?? []).map((result) => this.mapResult(result));
    return { jobs, totalCount: data.totalCount ?? jobs.length };
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

  private mapResult(result: JoobleApiResponse["jobs"][number]): IngestedJobResult {
    const salary = parseSalaryRange(result.salary ?? null);
    const sourceLabel = result.source ?? null;
    const category = result.type ?? null;
    return {
      id: String(result.id),
      title: result.title ?? "",
      company: result.company ?? null,
      description: stripHtmlToText(result.snippet ?? null),
      locationDisplayName: result.location ?? null,
      locationArea: result.location ?? null,
      salaryMin: salary.min,
      salaryMax: salary.max,
      category: category ?? sourceLabel,
      redirectUrl: result.link ?? null,
      created: normaliseUpdated(result.updated),
    };
  }
}

function parseSalaryRange(raw: string | null): { min: number | null; max: number | null } {
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

function normaliseUpdated(updated: string | undefined): string | null {
  if (!updated) return null;
  const parsed = DateTime.fromISO(updated);
  if (parsed.isValid) return parsed.toISO();
  return null;
}
