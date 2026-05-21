import { Injectable, Logger } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";
import { IngestedJobResult } from "./ingested-job.types";

interface RemotiveApiResponse {
  jobs?: Array<{
    id: number | string;
    url?: string;
    title: string;
    company_name?: string;
    company_logo?: string;
    category?: string;
    job_type?: string;
    publication_date?: string;
    candidate_required_location?: string;
    salary?: string;
    description?: string;
    tags?: string[];
  }>;
}

const REMOTIVE_BASE_URL = "https://remotive.com/api/remote-jobs";
const PUBLICATION_DELAY_HOURS = 24;

@Injectable()
export class RemotiveService {
  private readonly logger = new Logger(RemotiveService.name);

  async searchJobs(
    options: { category?: string; keywords?: string; resultsPerPage?: number } = {},
  ): Promise<{ jobs: IngestedJobResult[]; totalCount: number }> {
    const params = new URLSearchParams();
    if (options.category) {
      params.set("category", options.category);
    }
    if (options.keywords) {
      params.set("search", options.keywords);
    }
    if (options.resultsPerPage) {
      params.set("limit", String(options.resultsPerPage));
    }

    const url =
      params.toString().length > 0
        ? `${REMOTIVE_BASE_URL}?${params.toString()}`
        : REMOTIVE_BASE_URL;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Remotive API error ${response.status}: ${errorText}`);
      throw new Error(`Remotive API returned ${response.status}: ${errorText}`);
    }

    const data: RemotiveApiResponse = await response.json();
    const cutoff = DateTime.now().minus({ hours: PUBLICATION_DELAY_HOURS });
    const respected = (data.jobs ?? []).filter((job) => {
      if (!job.publication_date) return true;
      const published = DateTime.fromISO(job.publication_date);
      if (!published.isValid) return true;
      return published <= cutoff;
    });
    const jobs = respected.map((result) => this.mapResult(result));
    return { jobs, totalCount: jobs.length };
  }

  estimateExpiry(postedDate: string | null): Date | null {
    if (!postedDate) {
      return null;
    }
    const posted = DateTime.fromISO(postedDate);
    if (!posted.isValid) {
      return null;
    }
    return posted.plus({ days: 60 }).toJSDate();
  }

  private mapResult(result: NonNullable<RemotiveApiResponse["jobs"]>[number]): IngestedJobResult {
    const salary = parseRemotiveSalary(result.salary ?? null);
    const location = result.candidate_required_location ?? "Remote";
    return {
      id: String(result.id),
      title: result.title ?? "",
      company: result.company_name ?? null,
      description: result.description ?? null,
      locationDisplayName: location,
      locationArea: location,
      salaryMin: salary.min,
      salaryMax: salary.max,
      category: result.category ?? null,
      redirectUrl: result.url ?? null,
      created: result.publication_date ?? null,
    };
  }
}

function parseRemotiveSalary(raw: string | null): { min: number | null; max: number | null } {
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
