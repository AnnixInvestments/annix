import { JobSourceProvider } from "../../entities/job-market-source.entity";

// A crawl profile parameterises the single shared SitemapCrawlIngestionService
// for one open SA job board. The engine is generic; everything board-specific
// lives here so adding a board never means a new service.
export interface SitemapCrawlProfile {
  provider: JobSourceProvider;
  displayName: string;
  // Scheme + host with no trailing slash, e.g. "https://www.executiveplacements.com".
  origin: string;
  // One or more sitemap roots. Each may be a <sitemapindex> (recursed one level)
  // or a <urlset>.
  sitemapUrls: string[];
  // When a root is a sitemap index, only descend into nested sitemaps whose URL
  // matches this pattern (keeps us on the freshest "latest adverts" feeds rather
  // than the whole catalogue). Omit to descend into all nested sitemaps.
  preferredNestedSitemap?: RegExp;
  // A sitemap <loc> entry is a job-detail page iff this matches.
  jobUrlPattern: RegExp;
  // Derive the stable per-job id from its detail URL. Return null to skip the URL.
  externalIdFromUrl: (url: string) => string | null;
  // Optional board-specific hints appended to the generic extraction prompt.
  extractionHints?: string;
  // Crawl politeness overrides. Some boards (e.g. JobMail) 503 under the default
  // 3-concurrent/1.5s pace, so they fetch slower. Defaults: batchSize 3, delay 1500ms.
  batchSize?: number;
  crawlDelayMs?: number;
}

// The structured shape we ask Gemini to return per job page. Merged with the
// URL-derived id + redirectUrl into an IngestedJobResult by the engine.
export interface CrawledJobExtraction {
  title: string | null;
  company: string | null;
  locationDisplayName: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  category: string | null;
  description: string | null;
  postedAtIso: string | null;
}
