import { JobMarketSource } from "./job-market-source.entity";

export class ExternalJob {
  id: number;

  title: string;

  titleKey: string | null;

  company: string | null;

  country: string;

  locationRaw: string | null;

  locationArea: string | null;

  locationLat: number | null;

  locationLon: number | null;

  salaryMin: number | null;

  salaryMax: number | null;

  salaryCurrency: string | null;

  // Detected period the source quotes the salary in ("year" | "month"), and the
  // salary normalised to monthly so seekers (whose expectation is monthly) can be
  // matched/filtered against a single comparable figure.
  salaryPeriod: string | null;

  salaryMonthlyMin: number | null;

  salaryMonthlyMax: number | null;

  description: string | null;

  extractedSkills: string[];

  // When the Gemini skill/category analysis last ran for this job. Set even when
  // no skills were found, so empty-shell listings aren't re-analysed forever.
  skillsAnalyzedAt: Date | null;

  // When geocoding last ran for this job. Set even when geocoding found nothing,
  // so ungeocodable addresses aren't re-sent to the paid geocode API forever.
  geocodeAttemptedAt: Date | null;

  category: string | null;

  canonicalCategory: string | null;

  canonicalProvince: string | null;

  canonicalCity: string | null;

  sourceExternalId: string;

  sourceUrl: string | null;

  postedAt: Date | null;

  expiresAt: Date | null;

  lastSeenAt: Date | null;

  source: JobMarketSource;

  sourceId: number;

  embedding: Buffer | null;

  embeddingTextHash: string | null;

  delisted: boolean;

  delistReview: string | null;

  delistReportedAt: Date | null;

  delistReportedBy: string | null;

  delistedAt: Date | null;

  acceptsZa: boolean | null;

  vettingNotes: string | null;

  vettedAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
