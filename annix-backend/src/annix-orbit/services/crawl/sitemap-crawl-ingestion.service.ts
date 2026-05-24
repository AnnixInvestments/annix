import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { chunk, isNumber, isString } from "es-toolkit/compat";
import { In, Repository } from "typeorm";
import { stripHtmlToText } from "../../../lib/html-text";
import { parseJsonFromAi } from "../../../lib/json-from-ai";
import { ExtractionMetricService } from "../../../metrics/extraction-metric.service";
import { AiChatService } from "../../../nix/ai-providers/ai-chat.service";
import { ExternalJob } from "../../entities/external-job.entity";
import { JobMarketSource } from "../../entities/job-market-source.entity";
import { IngestedJobResult } from "../ingested-job.types";
import { CrawledJobExtraction, SitemapCrawlProfile } from "./sitemap-crawl.types";
import { sitemapCrawlProfile } from "./sitemap-crawl-profiles";

// SA boards permit crawling via robots.txt (Allow: /) but their CDNs reject
// non-browser User-Agents and XML-only Accept headers with HTTP 406, so we send
// a standard browser UA + Accept. This is not access-control circumvention —
// robots.txt is still honoured before every fetch.
const CRAWL_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const CRAWL_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const FETCH_TIMEOUT_MS = 20_000;
const PAGE_BATCH_SIZE = 3;
const POLITE_DELAY_MS = 1_500;
const MAX_NESTED_SITEMAPS = 3;
const MAX_DISCOVERY_URLS = 3_000;
const HTML_TEXT_LIMIT = 14_000;
const DESCRIPTION_LIMIT = 4_000;
const EXTRACTION_MAX_TOKENS = 2_000;
const METRIC_CATEGORY = "orbit-job-crawl";

const JOB_EXTRACTION_PROMPT = `You are extracting a single job advert from the visible text of a South African job-board page.

Return STRICT JSON (one object, no markdown, no prose) with exactly these camelCase fields:

{
  "title":               string|null,   // the job title only
  "company":             string|null,   // hiring company or recruiter name
  "locationDisplayName": string|null,   // full location text, e.g. "Johannesburg, Gauteng"
  "locationArea":        string|null,   // city or province only, e.g. "Johannesburg"
  "salaryMin":           number|null,   // numeric only, no currency symbols/commas; null if not stated
  "salaryMax":           number|null,   // numeric only; equal to salaryMin if a single figure is given
  "category":            string|null,   // e.g. "IT", "Finance", "Engineering"
  "description":         string|null,   // the job description as plain text, MAX 4000 chars
  "postedAtIso":         string|null    // ISO-8601 date the job was posted, if shown; else null
}

Rules:
- Use null for anything not present. Never invent values.
- salaryMin/salaryMax: digits only (strip "R", spaces, commas). If a range, min and max; if one figure, set both equal.
- description: clean readable text, drop navigation/cookie/advert boilerplate. Hard cap 4000 characters.
- Output ONLY the JSON object.`;

@Injectable()
export class SitemapCrawlIngestionService {
  private readonly logger = new Logger(SitemapCrawlIngestionService.name);
  private readonly robotsDisallowCache = new Map<string, string[]>();

  constructor(
    @InjectRepository(ExternalJob)
    private readonly externalJobRepo: Repository<ExternalJob>,
    private readonly aiChatService: AiChatService,
    private readonly extractionMetricService: ExtractionMetricService,
  ) {}

  async crawl(
    source: JobMarketSource,
    options: { maxPages: number },
  ): Promise<{ jobs: IngestedJobResult[]; pagesFetched: number }> {
    const profile = sitemapCrawlProfile(source.provider);
    if (!profile) {
      this.logger.warn(`No crawl profile registered for provider ${source.provider}`);
      return { jobs: [], pagesFetched: 0 };
    }

    if (options.maxPages <= 0) {
      return { jobs: [], pagesFetched: 0 };
    }

    const candidateUrls = await this.collectJobUrls(profile);
    if (candidateUrls.length === 0) {
      this.logger.warn(`[${profile.displayName}] sitemap yielded 0 job URLs`);
      return { jobs: [], pagesFetched: 0 };
    }

    const urlById = new Map<string, string>();
    candidateUrls.forEach((url) => {
      const id = profile.externalIdFromUrl(url);
      if (id && !urlById.has(id)) {
        urlById.set(id, url);
      }
    });

    const freshUrls = await this.dropAlreadyIngested(urlById, source.id);
    const toFetch = freshUrls.slice(0, options.maxPages);

    this.logger.log(
      `[${profile.displayName}] ${candidateUrls.length} sitemap jobs, ${freshUrls.length} new, fetching ${toFetch.length}`,
    );

    const batches = chunk(toFetch, PAGE_BATCH_SIZE);
    const collected: IngestedJobResult[] = [];
    let pagesFetched = 0;

    await batches.reduce(async (prev, batch, index) => {
      await prev;
      if (index > 0) {
        await delay(POLITE_DELAY_MS);
      }
      const results = await Promise.all(
        batch.map(async ({ id, url }) => {
          pagesFetched += 1;
          return this.fetchAndExtract(profile, url, id);
        }),
      );
      results.forEach((result) => {
        if (result) collected.push(result);
      });
    }, Promise.resolve());

    return { jobs: collected, pagesFetched };
  }

  private async dropAlreadyIngested(
    urlById: Map<string, string>,
    sourceId: number,
  ): Promise<Array<{ id: string; url: string }>> {
    const ids = [...urlById.keys()];
    if (ids.length === 0) return [];

    const existing = await this.externalJobRepo.find({
      where: { sourceExternalId: In(ids), sourceId },
      select: ["sourceExternalId"],
    });
    const known = new Set(existing.map((row) => row.sourceExternalId));

    return ids.filter((id) => !known.has(id)).map((id) => ({ id, url: urlById.get(id) as string }));
  }

  private async fetchAndExtract(
    profile: SitemapCrawlProfile,
    url: string,
    externalId: string,
  ): Promise<IngestedJobResult | null> {
    const allowed = await this.robotsAllows(profile, url);
    if (!allowed) {
      this.logger.debug(`[${profile.displayName}] robots.txt disallows ${url}`);
      return null;
    }

    const html = await this.fetchText(url);
    if (!html) {
      return null;
    }

    return this.extractionMetricService.time(
      METRIC_CATEGORY,
      profile.provider,
      () => this.extractJob(profile, url, externalId, html),
      html.length,
    );
  }

  private async extractJob(
    profile: SitemapCrawlProfile,
    url: string,
    externalId: string,
    html: string,
  ): Promise<IngestedJobResult> {
    const text = stripHtmlToText(html)?.slice(0, HTML_TEXT_LIMIT) ?? "";
    if (text.length < 80) {
      return this.fallbackResult(url, externalId, html);
    }

    const hints = profile.extractionHints ? `\n\n${profile.extractionHints}` : "";
    const prompt = `${JOB_EXTRACTION_PROMPT}${hints}\n\nSource URL: ${url}\n\nPAGE TEXT:\n${text}`;

    try {
      const result = await this.aiChatService.chat(
        [{ role: "user", content: prompt }],
        undefined,
        undefined,
        {
          responseFormat: "json",
          temperature: 0.1,
          thinkingBudget: 0,
          maxOutputTokens: EXTRACTION_MAX_TOKENS,
        },
      );
      const parsed = parseJsonFromAi<CrawledJobExtraction>(result.content);
      const title = clean(parsed.title);
      if (!title) {
        return this.fallbackResult(url, externalId, html);
      }
      return {
        id: externalId,
        title,
        company: clean(parsed.company),
        description: parsed.description ? parsed.description.slice(0, DESCRIPTION_LIMIT) : null,
        locationDisplayName: clean(parsed.locationDisplayName),
        locationArea: clean(parsed.locationArea),
        salaryMin: numeric(parsed.salaryMin),
        salaryMax: numeric(parsed.salaryMax),
        category: clean(parsed.category),
        redirectUrl: url,
        created: clean(parsed.postedAtIso),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[${profile.displayName}] extraction failed for ${url}: ${message}`);
      return this.fallbackResult(url, externalId, html);
    }
  }

  // Even when AI extraction fails we still emit a usable row from the
  // URL-derived id plus the page's <h1>/<title>, so a transient Gemini error
  // never drops a job entirely.
  private fallbackResult(url: string, externalId: string, html: string): IngestedJobResult {
    const heading = matchFirst(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const titleTag = matchFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = clean(stripHtmlToText(heading ?? titleTag ?? "")) ?? "Untitled vacancy";
    return {
      id: externalId,
      title: title.slice(0, 300),
      company: null,
      description: null,
      locationDisplayName: null,
      locationArea: null,
      salaryMin: null,
      salaryMax: null,
      category: null,
      redirectUrl: url,
      created: null,
    };
  }

  private async collectJobUrls(profile: SitemapCrawlProfile): Promise<string[]> {
    const rootDocs = await Promise.all(
      profile.sitemapUrls.map((url) => this.fetchSitemapDocument(url)),
    );

    const urlSetDocs = await Promise.all(
      rootDocs.map(async (doc) => {
        if (!doc) return [] as string[][];
        if (!isSitemapIndex(doc)) {
          return [parseSitemapLocs(doc)];
        }
        const nested = parseSitemapLocs(doc)
          .filter((url) =>
            profile.preferredNestedSitemap ? profile.preferredNestedSitemap.test(url) : true,
          )
          .slice(0, MAX_NESTED_SITEMAPS);
        const nestedDocs = await Promise.all(nested.map((url) => this.fetchSitemapDocument(url)));
        return nestedDocs.map((nestedDoc) => (nestedDoc ? parseSitemapLocs(nestedDoc) : []));
      }),
    );

    const allLocs = urlSetDocs.flat(2);
    const jobUrls = allLocs.filter((url) => profile.jobUrlPattern.test(url));
    return [...new Set(jobUrls)].slice(0, MAX_DISCOVERY_URLS);
  }

  private async fetchSitemapDocument(url: string): Promise<string | null> {
    const buffer = await this.fetchBuffer(url);
    if (!buffer) return null;
    return decodeXml(buffer);
  }

  private async robotsAllows(profile: SitemapCrawlProfile, url: string): Promise<boolean> {
    const path = pathOf(url);
    let disallows = this.robotsDisallowCache.get(profile.origin);
    if (!disallows) {
      const robots = await this.fetchText(`${profile.origin}/robots.txt`);
      disallows = robots ? parseDisallows(robots) : [];
      this.robotsDisallowCache.set(profile.origin, disallows);
    }
    return !disallows.some((rule) => rule.length > 0 && path.startsWith(rule));
  }

  private async fetchText(url: string): Promise<string | null> {
    const buffer = await this.fetchBuffer(url);
    return buffer ? buffer.toString("utf8") : null;
  }

  private async fetchBuffer(url: string): Promise<Buffer | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": CRAWL_USER_AGENT,
          Accept: CRAWL_ACCEPT,
        },
      });
      if (!response.ok) {
        this.logger.warn(`Fetch ${url} returned ${response.status}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Fetch ${url} failed: ${message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clean(value: string | null | undefined): string | null {
  if (!isString(value)) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numeric(value: number | null | undefined): number | null {
  return isNumber(value) && Number.isFinite(value) ? value : null;
}

function matchFirst(haystack: string, pattern: RegExp): string | null {
  const match = haystack.match(pattern);
  return match ? match[1] : null;
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

export function parseSitemapLocs(xml: string): string[] {
  const matches = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)];
  return matches.map((match) => decodeXmlEntities(match[1].trim()));
}

// Sitemaps from these boards are served UTF-16LE/BE (with BOM). Decode by BOM,
// falling back to UTF-8.
export function decodeXml(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer);
  }
  return buffer.toString("utf8");
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Minimal robots.txt parser: collects Disallow paths that apply to "*".
export function parseDisallows(robots: string): string[] {
  const lines = robots.split(/\r?\n/).map((line) => line.replace(/#.*$/, "").trim());
  const result: string[] = [];
  let appliesToAll = false;
  lines.forEach((line) => {
    const uaMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (uaMatch) {
      appliesToAll = uaMatch[1].trim() === "*";
      return;
    }
    const disallowMatch = line.match(/^disallow:\s*(.*)$/i);
    if (disallowMatch && appliesToAll) {
      const value = disallowMatch[1].trim();
      if (value.length > 0) result.push(value);
    }
  });
  return result;
}
