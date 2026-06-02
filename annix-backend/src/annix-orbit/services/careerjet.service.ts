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
const CAREERJET_LOCATION = "South Africa";
const CAREERJET_PAGE_SIZE = 100;
const CAREERJET_MAX_PAGES = 5;
const CAREERJET_TARGET = 200;
const CAREERJET_USER_IP = "196.10.52.1";
const CAREERJET_USER_AGENT = "AnnixOrbitJobBot/1.0 (+https://annix.co.za)";

@Injectable()
export class CareerjetService {
  private readonly logger = new Logger(CareerjetService.name);

  async searchJobs(
    affiliateId: string,
    options: { keywords?: string; resultsPerPage?: number } = {},
  ): Promise<{ jobs: IngestedJobResult[]; totalCount: number }> {
    const target = options.resultsPerPage ?? CAREERJET_TARGET;
    const authHeader = `Basic ${Buffer.from(`${affiliateId}:`).toString("base64")}`;
    const collected: IngestedJobResult[] = [];

    for (let page = 1; page <= CAREERJET_MAX_PAGES; page += 1) {
      if (collected.length >= target) break;

      const params = new URLSearchParams({
        locale_code: CAREERJET_LOCALE,
        location: CAREERJET_LOCATION,
        sort: "date",
        page: String(page),
        page_size: String(CAREERJET_PAGE_SIZE),
        user_ip: CAREERJET_USER_IP,
        user_agent: CAREERJET_USER_AGENT,
      });
      if (options.keywords) params.set("keywords", options.keywords);

      const response = await fetch(`${CAREERJET_BASE_URL}?${params.toString()}`, {
        headers: { Authorization: authHeader, Accept: "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Careerjet API error ${response.status} on page ${page}: ${errorText}`);
        throw new Error(`Careerjet API returned ${response.status}: ${errorText}`);
      }

      const data: CareerjetApiResponse = await response.json();
      const rawJobs = data.jobs ?? [];
      if (rawJobs.length === 0) break;

      collected.push(...rawJobs.map((job) => this.mapResult(job)));

      if (rawJobs.length < CAREERJET_PAGE_SIZE) break;
    }

    const jobs = collected.slice(0, target);
    return { jobs, totalCount: jobs.length };
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
    const posted = result.date ? DateTime.fromISO(result.date) : null;
    const created = posted?.isValid ? posted.toISO() : null;
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
