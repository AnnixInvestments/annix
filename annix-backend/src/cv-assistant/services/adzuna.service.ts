import { Injectable, Logger } from "@nestjs/common";
import { DateTime } from "../../lib/datetime";

export interface AdzunaJobResult {
  id: string;
  title: string;
  company: string | null;
  description: string | null;
  locationDisplayName: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  category: string | null;
  redirectUrl: string | null;
  created: string | null;
}

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

@Injectable()
export class AdzunaService {
  private readonly logger = new Logger(AdzunaService.name);

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
      content_type: "application/json",
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

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Adzuna API error ${response.status}: ${errorText}`);
      throw new Error(`Adzuna API returned ${response.status}: ${errorText}`);
    }

    const data: AdzunaApiResponse = await response.json();

    const jobs = data.results.map((result) => this.mapResult(result));

    return { jobs, totalCount: data.count };
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
    const response = await fetch(url);

    if (!response.ok) {
      this.logger.error(`Adzuna categories API error: ${response.status}`);
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
    const locationArea = areaArray.length > 1 ? areaArray[areaArray.length - 1] : (areaArray[0] ?? null);

    return {
      id: String(result.id),
      title: result.title ?? "",
      company: result.company?.display_name ?? null,
      description: result.description ?? null,
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
}
