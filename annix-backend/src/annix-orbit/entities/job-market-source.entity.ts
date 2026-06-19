import { AnnixOrbitCompany } from "./annix-orbit-company.entity";

export enum JobSourceProvider {
  ADZUNA = "adzuna",
  REMOTIVE = "remotive",
  DPSA = "dpsa",
  EXECUTIVE_PLACEMENTS = "executiveplacements",
  JOB_PLACEMENTS = "jobplacements",
  JOBMAIL = "jobmail",
  CAREERJUNCTION = "careerjunction",
  CAREERJET = "careerjet",
  JOOBLE = "jooble",
}

export class JobMarketSource {
  id: number;

  provider: JobSourceProvider;

  name: string;

  apiId: string | null;

  apiKeyEncrypted: string | null;

  countryCodes: string[];

  categories: string[];

  /**
   * Seeker match-tiers (soft/medium/hard) this source's jobs are visible to.
   * Empty/null = visible to all tiers. Drives tier-gated source visibility in
   * the seeker job feed (#305).
   */
  visibleTiers: string[] | null;

  enabled: boolean;

  rateLimitPerDay: number;

  requestsToday: number;

  requestsResetAt: Date | null;

  lastIngestedAt: Date | null;

  lastHealthAlertAt: Date | null;

  lastIngestionError: string | null;

  // Number of consecutive failed ingestion runs. Reset to 0 on any successful
  // run. The health alert only fires once this crosses the threshold, so a
  // single transient upstream blip (e.g. an Adzuna 503 that recovers next run)
  // does not email.
  consecutiveIngestFailures: number;

  ingestionIntervalHours: number;

  requiresVetting: boolean;

  company: AnnixOrbitCompany | null;

  companyId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
