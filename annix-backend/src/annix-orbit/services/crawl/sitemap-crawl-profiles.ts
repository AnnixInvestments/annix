import { JobSourceProvider } from "../../entities/job-market-source.entity";
import { SitemapCrawlProfile } from "./sitemap-crawl.types";

// Executive Placements and Job Placements are sister sites on the same engine:
// a flat sitemap.xml (UTF-16) listing category pages plus job-detail pages under
// /Jobs/D/, where the detail URL carries a stable numeric id before "-Job-Search-".
const EXEC_JOB_URL = /\/Jobs\/D\//i;
const EXEC_ID = /-(\d+)-Job-Search-/i;

function execStyleId(url: string): string | null {
  const match = url.match(EXEC_ID);
  return match ? match[1] : null;
}

const EXECUTIVE_PLACEMENTS: SitemapCrawlProfile = {
  provider: JobSourceProvider.EXECUTIVE_PLACEMENTS,
  displayName: "Executive Placements",
  origin: "https://www.executiveplacements.com",
  sitemapUrls: ["https://www.executiveplacements.com/sitemap.xml"],
  jobUrlPattern: EXEC_JOB_URL,
  externalIdFromUrl: execStyleId,
};

const JOB_PLACEMENTS: SitemapCrawlProfile = {
  provider: JobSourceProvider.JOB_PLACEMENTS,
  displayName: "Job Placements",
  origin: "https://www.jobplacements.com",
  sitemapUrls: ["https://www.jobplacements.com/sitemap.xml"],
  jobUrlPattern: EXEC_JOB_URL,
  externalIdFromUrl: execStyleId,
};

// JobMail publishes a sitemap index; the "latest-adverts" feeds hold the freshest
// listings. Job-detail URLs look like /jobs/{industry}/{subcat}/{location}/{slug}-id-{id}.
const JOBMAIL: SitemapCrawlProfile = {
  provider: JobSourceProvider.JOBMAIL,
  displayName: "JobMail",
  origin: "https://www.jobmail.co.za",
  sitemapUrls: ["https://www.jobmail.co.za/sitemap.xml"],
  preferredNestedSitemap: /latest-adverts\d*\.xml/i,
  jobUrlPattern: /\/jobs\/.+-id-\d+\/?$/i,
  externalIdFromUrl: (url: string): string | null => {
    const match = url.match(/-id-(\d+)\/?$/i);
    return match ? match[1] : null;
  },
  // JobMail returns 503 under the default concurrent pace — crawl one page at a
  // time with a longer gap, and keep each run small so it completes (and persists)
  // before a dev rebuild interrupts the ~slow crawl. Backfills over multiple runs.
  batchSize: 1,
  crawlDelayMs: 2500,
  maxPagesPerRun: 40,
};

// CareerJunction publishes NO sitemap, so we discover job links off its HTML
// listing pages (/jobs?page=N). Job-detail URLs look like
// /{slug}-job-{id}.aspx with a stable numeric id before ".aspx".
const CAREERJUNCTION: SitemapCrawlProfile = {
  provider: JobSourceProvider.CAREERJUNCTION,
  displayName: "CareerJunction",
  origin: "https://www.careerjunction.co.za",
  sitemapUrls: [],
  discoveryUrls: Array.from(
    { length: 12 },
    (_, index) => `https://www.careerjunction.co.za/jobs?page=${index + 1}`,
  ),
  jobUrlPattern: /-job-\d+\.aspx/i,
  externalIdFromUrl: (url: string): string | null => {
    const match = url.match(/-job-(\d+)\.aspx/i);
    return match ? match[1] : null;
  },
  maxPagesPerRun: 50,
};

const PROFILES: SitemapCrawlProfile[] = [
  EXECUTIVE_PLACEMENTS,
  JOB_PLACEMENTS,
  JOBMAIL,
  CAREERJUNCTION,
];

const PROFILE_BY_PROVIDER = new Map<JobSourceProvider, SitemapCrawlProfile>(
  PROFILES.map((profile) => [profile.provider, profile]),
);

export function sitemapCrawlProfile(provider: JobSourceProvider): SitemapCrawlProfile | null {
  return PROFILE_BY_PROVIDER.get(provider) ?? null;
}

export function isSitemapCrawlProvider(provider: JobSourceProvider): boolean {
  return PROFILE_BY_PROVIDER.has(provider);
}

export function sitemapCrawlProviders(): JobSourceProvider[] {
  return PROFILES.map((profile) => profile.provider);
}
