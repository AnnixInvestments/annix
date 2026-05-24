import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AnnixOrbitCompany } from "../../src/annix-orbit/entities/annix-orbit-company.entity";
import { ExternalJob } from "../../src/annix-orbit/entities/external-job.entity";
import { ExternalJobAlternate } from "../../src/annix-orbit/entities/external-job-alternate.entity";
import {
  JobMarketSource,
  JobSourceProvider,
} from "../../src/annix-orbit/entities/job-market-source.entity";
import { JobPosting } from "../../src/annix-orbit/entities/job-posting.entity";
import { AdzunaService } from "../../src/annix-orbit/services/adzuna.service";
import { CandidateJobMatchingService } from "../../src/annix-orbit/services/candidate-job-matching.service";
import { SitemapCrawlIngestionService } from "../../src/annix-orbit/services/crawl/sitemap-crawl-ingestion.service";
import { EmbeddingService } from "../../src/annix-orbit/services/embedding.service";
import { JobIngestionService } from "../../src/annix-orbit/services/job-ingestion.service";
import { RemotiveService } from "../../src/annix-orbit/services/remotive.service";
import { EmailService } from "../../src/email/email.service";

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
      create: jest.fn((dto: Partial<ExternalJob>) => ({ ...dto })),
      save: jest.fn(async (job: ExternalJobRow) => {
        const next = { ...job, id: nextExternalJobId++ };
        externalJobs.push(next);
        return next;
      }),
      find: jest.fn(async (opts: { where?: { sourceExternalId?: unknown; sourceId?: number } }) => {
        const where = opts?.where;
        if (!where) return externalJobs;
        const sourceFilter = where.sourceId;
        const idFilter = extractInValues(where.sourceExternalId);
        return externalJobs.filter(
          (j) =>
            (sourceFilter === undefined || j.sourceId === sourceFilter) &&
            (idFilter === null || idFilter.includes(j.sourceExternalId)),
        );
      }),
      findOne: jest.fn(
        async ({ where }: { where: { id: number } }) =>
          externalJobs.find((j) => j.id === where.id) ?? null,
      ),
      count: jest.fn(async (opts?: { where?: { sourceId?: number } }) => {
        const sid = opts?.where?.sourceId;
        if (sid === undefined) return externalJobs.length;
        return externalJobs.filter((j) => j.sourceId === sid).length;
      }),
      query: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(externalJobs),
        getManyAndCount: jest.fn().mockResolvedValue([externalJobs, externalJobs.length]),
        getCount: jest.fn().mockResolvedValue(externalJobs.length),
      })),
    };

    const alternateRepo = {
      create: jest.fn((dto: Partial<AlternateRow>) => ({ ...dto })),
      save: jest.fn(async (alt: AlternateRow) => {
        const next = { ...alt, id: nextAlternateId++ };
        alternates.push(next);
        return next;
      }),
      find: jest.fn(async (opts: { where?: { sourceExternalId?: unknown; sourceId?: number } }) => {
        const where = opts?.where;
        if (!where) return alternates;
        const sourceFilter = where.sourceId;
        const idFilter = extractInValues(where.sourceExternalId);
        return alternates.filter(
          (a) =>
            (sourceFilter === undefined || a.sourceId === sourceFilter) &&
            (idFilter === null || idFilter.includes(a.sourceExternalId)),
        );
      }),
    };

    const sourceRepo = {
      save: jest.fn(async (s) => s),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobIngestionService,
        { provide: getRepositoryToken(JobMarketSource), useValue: sourceRepo },
        { provide: getRepositoryToken(ExternalJob), useValue: externalJobRepo },
        { provide: getRepositoryToken(ExternalJobAlternate), useValue: alternateRepo },
        { provide: getRepositoryToken(JobPosting), useValue: {} },
        { provide: getRepositoryToken(AnnixOrbitCompany), useValue: {} },
        {
          provide: AdzunaService,
          useValue: { searchJobs: adzunaSearchJobs, estimateExpiry: () => null },
        },
        { provide: RemotiveService, useValue: {} },
        { provide: SitemapCrawlIngestionService, useValue: {} },
        { provide: EmbeddingService, useValue: { embedExternalJob } },
        { provide: CandidateJobMatchingService, useValue: { matchJobToCandidates } },
        { provide: EmailService, useValue: { sendEmail: jest.fn().mockResolvedValue(true) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
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

function extractInValues(value: unknown): string[] | null {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "object" && value !== null && "_value" in value) {
    const inner = (value as { _value: unknown })._value;
    if (Array.isArray(inner)) return inner.map(String);
  }
  if (typeof value === "string") return [value];
  return null;
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
