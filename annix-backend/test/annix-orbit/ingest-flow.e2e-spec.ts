import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { ExternalJob } from "../../src/annix-orbit/entities/external-job.entity";
import {
  JobMarketSource,
  JobSourceProvider,
} from "../../src/annix-orbit/entities/job-market-source.entity";
import { AnnixOrbitCompanyRepository } from "../../src/annix-orbit/repositories/annix-orbit-company.repository";
import { ExternalJobRepository } from "../../src/annix-orbit/repositories/external-job.repository";
import { ExternalJobAlternateRepository } from "../../src/annix-orbit/repositories/external-job-alternate.repository";
import { JobMarketSourceRepository } from "../../src/annix-orbit/repositories/job-market-source.repository";
import { JobPostingRepository } from "../../src/annix-orbit/repositories/job-posting.repository";
import { SourceRespectRankRepository } from "../../src/annix-orbit/repositories/source-respect-rank.repository";
import { AdzunaService } from "../../src/annix-orbit/services/adzuna.service";
import { CandidateJobMatchingService } from "../../src/annix-orbit/services/candidate-job-matching.service";
import { CareerjetService } from "../../src/annix-orbit/services/careerjet.service";
import { SitemapCrawlIngestionService } from "../../src/annix-orbit/services/crawl/sitemap-crawl-ingestion.service";
import { DpsaCircularService } from "../../src/annix-orbit/services/dpsa-circular.service";
import { EmbeddingService } from "../../src/annix-orbit/services/embedding.service";
import { GeocodeService } from "../../src/annix-orbit/services/geocode.service";
import { JobCategorizationService } from "../../src/annix-orbit/services/job-categorization.service";
import { JobIngestionService } from "../../src/annix-orbit/services/job-ingestion.service";
import { JobVettingService } from "../../src/annix-orbit/services/job-vetting.service";
import { JoobleService } from "../../src/annix-orbit/services/jooble.service";
import { RemotiveService } from "../../src/annix-orbit/services/remotive.service";
import { EmailService } from "../../src/email/email.service";
import { ExtractionMetricService } from "../../src/metrics/extraction-metric.service";

interface ExternalJobRow {
  id: number;
  sourceExternalId: string;
  sourceId: number;
  title: string;
  company: string | null;
  country: string;
  locationRaw: string | null;
  locationArea: string | null;
  category: string | null;
}

interface AlternateRow {
  id: number;
  canonicalExternalJobId: number;
  sourceId: number;
  sourceExternalId: string;
}

const adzunaFixture = [
  {
    id: "adz-1",
    title: "Coded Boilermaker",
    company: "Kathu Mining",
    locationDisplayName: "Kathu, Northern Cape",
    locationArea: "Kathu",
    salaryMin: 30000,
    salaryMax: 45000,
    description: "Pressure-vessel boilermaker required for shutdown crew.",
    category: "engineering-jobs",
    redirectUrl: "https://example.com/adz/1",
    created: "2026-05-10T08:00:00Z",
  },
];

function buildAdzunaSource(overrides: Partial<JobMarketSource> = {}): JobMarketSource {
  return {
    id: 1,
    name: "Adzuna ZA",
    enabled: true,
    provider: JobSourceProvider.ADZUNA,
    countryCodes: ["za"],
    categories: ["engineering-jobs"],
    rateLimitPerDay: 200,
    requestsToday: 0,
    apiId: "test-app-id",
    apiKeyEncrypted: "test-key",
    requiresVetting: false,
    ingestionIntervalHours: 6,
    lastIngestedAt: null,
    requestsResetAt: null,
    ...overrides,
  } as JobMarketSource;
}

describe("Annix Orbit - JobIngestionService.ingestFromSource (mocked repos)", () => {
  let service: JobIngestionService;
  let externalJobs: ExternalJobRow[];
  let alternates: AlternateRow[];
  let nextExternalJobId: number;
  let nextAlternateId: number;
  let embedExternalJob: jest.Mock;
  let matchJobToCandidates: jest.Mock;
  let adzunaSearchJobs: jest.Mock;

  beforeEach(async () => {
    externalJobs = [];
    alternates = [];
    nextExternalJobId = 1;
    nextAlternateId = 1;

    adzunaSearchJobs = jest.fn().mockResolvedValue({ jobs: adzunaFixture });
    embedExternalJob = jest.fn().mockResolvedValue(true);
    matchJobToCandidates = jest.fn().mockResolvedValue([]);

    const externalJobRepo = {
      create: jest.fn(async (dto: Partial<ExternalJob>) => {
        const next = { ...dto, id: nextExternalJobId++ } as unknown as ExternalJobRow;
        externalJobs.push(next);
        return next;
      }),
      findByExternalIds: jest.fn(async (externalIds: string[], sourceId: number) =>
        externalJobs.filter(
          (j) => j.sourceId === sourceId && externalIds.includes(j.sourceExternalId),
        ),
      ),
      findById: jest.fn(async (id: number) => externalJobs.find((j) => j.id === id) ?? null),
      stampLastSeenByExternalIds: jest.fn().mockResolvedValue(undefined),
      stampLastSeenByIds: jest.fn().mockResolvedValue(undefined),
      findDuplicateCanonicalJob: jest.fn().mockResolvedValue(null),
      markJobGeocoded: jest.fn().mockResolvedValue(undefined),
      updateVetting: jest.fn().mockResolvedValue(undefined),
      enforceRetentionCap: jest.fn().mockResolvedValue(0),
      count: jest.fn(async () => externalJobs.length),
    };

    const alternateRepo = {
      create: jest.fn(async (dto: Partial<AlternateRow>) => {
        const next = { ...dto, id: nextAlternateId++ } as AlternateRow;
        alternates.push(next);
        return next;
      }),
      findByExternalIds: jest.fn(async (externalIds: string[], sourceId: number) =>
        alternates.filter(
          (a) => a.sourceId === sourceId && externalIds.includes(a.sourceExternalId),
        ),
      ),
      deleteByCanonicalId: jest.fn().mockResolvedValue(undefined),
      deleteByCanonicalIds: jest.fn().mockResolvedValue(undefined),
    };

    const sourceRepo = {
      save: jest.fn(async (s) => s),
      findEnabled: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findByIds: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobIngestionService,
        { provide: JobMarketSourceRepository, useValue: sourceRepo },
        { provide: ExternalJobRepository, useValue: externalJobRepo },
        { provide: ExternalJobAlternateRepository, useValue: alternateRepo },
        {
          provide: SourceRespectRankRepository,
          useValue: { findAll: jest.fn().mockResolvedValue([]) },
        },
        { provide: JobPostingRepository, useValue: {} },
        { provide: AnnixOrbitCompanyRepository, useValue: {} },
        {
          provide: AdzunaService,
          useValue: { searchJobs: adzunaSearchJobs, estimateExpiry: () => null },
        },
        {
          provide: RemotiveService,
          useValue: { searchJobs: jest.fn(), estimateExpiry: () => null },
        },
        { provide: CareerjetService, useValue: { searchAcrossCategories: jest.fn() } },
        { provide: JoobleService, useValue: { searchJobs: jest.fn() } },
        { provide: EmbeddingService, useValue: { embedExternalJob } },
        { provide: CandidateJobMatchingService, useValue: { matchJobToCandidates } },
        { provide: EmailService, useValue: { sendEmail: jest.fn().mockResolvedValue(true) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
        { provide: GeocodeService, useValue: { geocode: jest.fn().mockResolvedValue(null) } },
        {
          provide: JobVettingService,
          useValue: { vet: jest.fn().mockResolvedValue({ acceptsZa: true, notes: "" }) },
        },
        {
          provide: DpsaCircularService,
          useValue: { ingestLatestCircular: jest.fn().mockResolvedValue({ ingested: 0 }) },
        },
        {
          provide: JobCategorizationService,
          useValue: {
            ruleBased: jest.fn().mockReturnValue(null),
            categorize: jest.fn().mockResolvedValue(null),
            analyzeJob: jest.fn().mockResolvedValue({ skills: [], category: null }),
          },
        },
        { provide: SitemapCrawlIngestionService, useValue: { crawl: jest.fn() } },
        {
          provide: ExtractionMetricService,
          useValue: { time: jest.fn((_c, _o, fn: () => unknown) => fn()) },
        },
      ],
    }).compile();

    service = module.get(JobIngestionService);
  });

  it("ingests a fresh Adzuna job, persists it, then triggers embed + match", async () => {
    const source = buildAdzunaSource();

    const totals = await service.ingestFromSource(source);

    expect(totals.ingested).toBe(1);
    expect(totals.skipped).toBe(0);
    expect(adzunaSearchJobs).toHaveBeenCalledTimes(1);
    expect(externalJobs).toHaveLength(1);
    expect(externalJobs[0]).toMatchObject({
      title: "Coded Boilermaker",
      company: "Kathu Mining",
      locationArea: "Kathu",
      country: "za",
      sourceExternalId: "adz-1",
      sourceId: 1,
    });

    await flushPromises();

    expect(embedExternalJob).toHaveBeenCalledTimes(1);
    expect(embedExternalJob).toHaveBeenCalledWith(externalJobs[0].id);
    expect(matchJobToCandidates).toHaveBeenCalledTimes(1);
    expect(matchJobToCandidates).toHaveBeenCalledWith(externalJobs[0].id);
  });

  it("dedup: a second ingestion of the same source_external_id is skipped, not re-saved", async () => {
    const source = buildAdzunaSource();
    await service.ingestFromSource(source);
    expect(externalJobs).toHaveLength(1);
    const firstId = externalJobs[0].id;

    source.requestsToday = 0;
    const totals = await service.ingestFromSource(source);

    expect(totals.ingested).toBe(0);
    expect(totals.skipped).toBe(1);
    expect(externalJobs).toHaveLength(1);
    expect(externalJobs[0].id).toBe(firstId);
  });

  it("does not invoke the adapter when API credentials are missing", async () => {
    const source = buildAdzunaSource({ apiId: null, apiKeyEncrypted: null });

    const totals = await service.ingestFromSource(source);

    expect(totals.ingested).toBe(0);
    expect(adzunaSearchJobs).not.toHaveBeenCalled();
    expect(externalJobs).toHaveLength(0);
  });

  it("respects the daily rate limit and returns without calling the adapter", async () => {
    const source = buildAdzunaSource({
      requestsToday: 200,
      rateLimitPerDay: 200,
      requestsResetAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const totals = await service.ingestFromSource(source);

    expect(totals.ingested).toBe(0);
    expect(adzunaSearchJobs).not.toHaveBeenCalled();
  });

  it("skips a job that already exists as an alternate from a different ingestion run", async () => {
    alternates.push({
      id: 999,
      canonicalExternalJobId: 1,
      sourceId: 1,
      sourceExternalId: "adz-1",
    });

    const source = buildAdzunaSource();
    const totals = await service.ingestFromSource(source);

    expect(totals.ingested).toBe(0);
    expect(totals.skipped).toBe(1);
    expect(externalJobs).toHaveLength(0);
  });
});

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
