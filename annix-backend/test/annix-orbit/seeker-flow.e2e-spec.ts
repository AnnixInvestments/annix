import { Test, TestingModule } from "@nestjs/testing";
import {
  JobMarketSource,
  JobSourceProvider,
} from "../../src/annix-orbit/entities/job-market-source.entity";
import { AnnixOrbitIndividualDocumentRepository } from "../../src/annix-orbit/repositories/annix-orbit-individual-document.repository";
import { AnnixOrbitProfileRepository } from "../../src/annix-orbit/repositories/annix-orbit-profile.repository";
import { CandidateRepository } from "../../src/annix-orbit/repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../../src/annix-orbit/repositories/candidate-job-match.repository";
import { CandidateReferenceRepository } from "../../src/annix-orbit/repositories/candidate-reference.repository";
import { ExternalJobRepository } from "../../src/annix-orbit/repositories/external-job.repository";
import { JobMarketSourceRepository } from "../../src/annix-orbit/repositories/job-market-source.repository";
import { OrbitDismissReasonRepository } from "../../src/annix-orbit/repositories/orbit-dismiss-reason.repository";
import { OrbitTierCapabilityRepository } from "../../src/annix-orbit/repositories/orbit-tier-capability.repository";
import { PendingSeekerTierRepository } from "../../src/annix-orbit/repositories/pending-seeker-tier.repository";
import { SeekerApplyClickRepository } from "../../src/annix-orbit/repositories/seeker-apply-click.repository";
import { SeekerMuteRepository } from "../../src/annix-orbit/repositories/seeker-mute.repository";
import { SeekerUsageCounterRepository } from "../../src/annix-orbit/repositories/seeker-usage-counter.repository";
import { CandidateJobMatchingService } from "../../src/annix-orbit/services/candidate-job-matching.service";
import { CvNotificationService } from "../../src/annix-orbit/services/cv-notification.service";
import { JobMarketCountriesService } from "../../src/annix-orbit/services/job-market-countries.service";
import { SeekerJobFeedService } from "../../src/annix-orbit/services/seeker-job-feed.service";
import { SeekerTelemetryService } from "../../src/annix-orbit/services/seeker-telemetry.service";
import { ExtractionMetricService } from "../../src/metrics/extraction-metric.service";
import { STORAGE_SERVICE } from "../../src/storage/storage.interface";
import { UserRepository } from "../../src/user/user.repository";

interface ExternalJobLike {
  id: number;
  title: string;
  company: string | null;
  country: string;
  locationRaw: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  description: string | null;
  extractedSkills: string[];
  category: string | null;
  canonicalCategory: string | null;
  sourceUrl: string | null;
  postedAt: Date | null;
  expiresAt: Date | null;
  sourceId: number;
}

interface MatchLike {
  id: number;
  candidateId: number;
  externalJobId: number;
  similarityScore: number;
  structuredScore: number;
  overallScore: number;
  dismissed: boolean;
  matchDetails: Record<string, unknown>;
  externalJob: ExternalJobLike;
}

describe("Annix Orbit - Seeker flow integration (post-ingest)", () => {
  let feed: SeekerJobFeedService;
  let externalJobsStore: ExternalJobLike[];
  let matchesStore: MatchLike[];

  const adzunaSource = {
    id: 1,
    name: "Adzuna ZA",
    provider: JobSourceProvider.ADZUNA,
  } as Partial<JobMarketSource> as JobMarketSource;

  const seekerCandidate = {
    id: 100,
    email: "ada@example.com",
    name: "Ada Seeker",
    embedding: [0.1, 0.2, 0.3],
    matchTier: "soft",
    jobAlertsOptIn: true,
    popiaConsent: true,
    targetCountries: ["za"],
    extractedData: {
      skills: ["welding", "boilermaking"],
      education: [],
      certifications: [],
      experienceYears: 8,
      summary: "Coded welder based in Gauteng",
    },
  };

  beforeEach(async () => {
    externalJobsStore = [
      {
        id: 1,
        title: "Coded Boilermaker",
        company: "Kathu Mining",
        country: "za",
        locationRaw: "Kathu, Northern Cape",
        locationArea: "Kathu",
        salaryMin: 30000,
        salaryMax: 45000,
        salaryCurrency: "ZAR",
        description: "Pressure vessel boilermaker required for shutdown crew.",
        extractedSkills: ["welding", "rigging"],
        category: "engineering-jobs",
        canonicalCategory: "engineering-jobs",
        sourceUrl: "https://example.com/adz/1",
        postedAt: new Date("2026-05-10T08:00:00Z"),
        expiresAt: null,
        sourceId: 1,
      },
    ];

    matchesStore = [
      {
        id: 1,
        candidateId: 100,
        externalJobId: 1,
        similarityScore: 0.91,
        structuredScore: 0.78,
        overallScore: 0.85,
        dismissed: false,
        matchDetails: {
          embeddingSimilarity: 0.91,
          skillsOverlap: 0.5,
          skillsMatched: ["welding"],
          skillsMissing: ["rigging"],
          experienceMatch: 1.0,
          locationMatch: 0.7,
          reasoning: "Profile similarity: 91%. Matching skills: welding.",
        },
        externalJob: externalJobsStore[0],
      },
    ];

    const candidateRepo = {
      findByEmail: jest.fn(async (email: string) =>
        email === seekerCandidate.email ? [seekerCandidate] : [],
      ),
      updateMatchTier: jest.fn().mockResolvedValue(undefined),
    };
    const sourceRepo = {
      findByIds: jest.fn(async () => [adzunaSource]),
      findManyWhere: jest.fn().mockResolvedValue([adzunaSource]),
    };
    const matchRepo = {
      findById: jest.fn(async (id: number) => matchesStore.find((m) => m.id === id) ?? null),
      facetRowsForCandidates: jest.fn().mockResolvedValue([]),
      countActiveForCandidates: jest.fn().mockResolvedValue(0),
      countActiveForCandidatesSince: jest.fn().mockResolvedValue(0),
    };

    const mockMatchingService = {
      recommendedJobsForCandidate: jest.fn(async () => matchesStore.filter((m) => !m.dismissed)),
      dismissMatch: jest.fn(async (id: number) => {
        const m = matchesStore.find((mm) => mm.id === id);
        if (m) m.dismissed = true;
      }),
      isBelowSalaryFloor: jest.fn().mockReturnValue(false),
    };

    const muteRepo = {
      listForCandidates: jest.fn().mockResolvedValue([]),
      findByCandidateAndCompany: jest.fn().mockResolvedValue(null),
      findByCandidateAndCategory: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      deleteById: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(async (m) => ({ ...m, id: 1 })),
      save: jest.fn(async (m) => ({ ...m, id: 1 })),
    };

    const tierCapabilityRepo = {
      findByTier: jest.fn().mockResolvedValue(null),
    };
    const usageCounterRepo = {
      getCount: jest.fn().mockResolvedValue(0),
      increment: jest.fn().mockResolvedValue(undefined),
    };
    const userRepo = {
      findOneByEmailAnyScope: jest.fn().mockResolvedValue(null),
      findByEmailsAnyScope: jest.fn().mockResolvedValue([]),
    };
    const profileRepo = {
      findByUserId: jest.fn().mockResolvedValue(null),
      setSelectedTier: jest.fn().mockResolvedValue(undefined),
    };
    const countriesService = {
      enabledCountries: jest.fn().mockResolvedValue(["za"]),
    };
    const seekerTelemetry = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeekerJobFeedService,
        { provide: CandidateRepository, useValue: candidateRepo },
        { provide: JobMarketSourceRepository, useValue: sourceRepo },
        { provide: CandidateJobMatchRepository, useValue: matchRepo },
        { provide: SeekerApplyClickRepository, useValue: {} },
        {
          provide: ExternalJobRepository,
          useValue: { findById: jest.fn().mockResolvedValue(null) },
        },
        { provide: SeekerMuteRepository, useValue: muteRepo },
        { provide: CandidateJobMatchingService, useValue: mockMatchingService },
        {
          provide: ExtractionMetricService,
          useValue: {
            time: jest.fn((_c, _o, fn: () => unknown) => fn()),
            stats: jest.fn().mockResolvedValue({ averageMs: null, sampleSize: 0 }),
          },
        },
        { provide: AnnixOrbitProfileRepository, useValue: profileRepo },
        { provide: AnnixOrbitIndividualDocumentRepository, useValue: {} },
        { provide: UserRepository, useValue: userRepo },
        { provide: CandidateReferenceRepository, useValue: {} },
        { provide: OrbitTierCapabilityRepository, useValue: tierCapabilityRepo },
        { provide: SeekerUsageCounterRepository, useValue: usageCounterRepo },
        {
          provide: OrbitDismissReasonRepository,
          useValue: { findByCode: jest.fn().mockResolvedValue(null) },
        },
        { provide: JobMarketCountriesService, useValue: countriesService },
        { provide: SeekerTelemetryService, useValue: seekerTelemetry },
        {
          provide: CvNotificationService,
          useValue: { sendPushToUser: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: STORAGE_SERVICE, useValue: { presignedUrl: jest.fn().mockResolvedValue("") } },
        {
          provide: PendingSeekerTierRepository,
          useValue: { findByEmailNormalized: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    feed = module.get(SeekerJobFeedService);
  });

  it("surfaces a matched Adzuna job on the seeker recommended feed with source attribution", async () => {
    const result = await feed.recommendedForSeeker("ada@example.com");

    expect(result.candidateIds).toEqual([100]);
    expect(result.matches).toHaveLength(1);
    const top = result.matches[0];
    expect(top.externalJobId).toBe(1);
    expect(top.overallScore).toBeCloseTo(0.85, 2);
    expect(top.job.title).toBe("Coded Boilermaker");
    expect(top.job.locationArea).toBe("Kathu");
    expect(top.job.sourceProvider).toBe(JobSourceProvider.ADZUNA);
    expect(top.matchDetails?.skillsMatched).toEqual(["welding"]);
  });

  it("filters out dismissed matches", async () => {
    matchesStore[0].dismissed = true;

    const result = await feed.recommendedForSeeker("ada@example.com");
    expect(result.matches).toHaveLength(0);
    expect(result.candidateIds).toEqual([100]);
  });

  it("returns empty matches for a seeker who has no candidate row", async () => {
    const result = await feed.recommendedForSeeker("nobody@example.com");
    expect(result.matches).toEqual([]);
    expect(result.candidateIds).toEqual([]);
  });

  it("dedupes matches across multiple candidate rows by externalJobId, keeping the highest score", async () => {
    matchesStore.push({
      ...matchesStore[0],
      id: 2,
      candidateId: 100,
      overallScore: 0.91,
      similarityScore: 0.95,
    });

    const result = await feed.recommendedForSeeker("ada@example.com");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].overallScore).toBeCloseTo(0.91, 2);
  });
});
