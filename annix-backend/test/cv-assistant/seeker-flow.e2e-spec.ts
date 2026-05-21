import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Candidate } from "../../src/cv-assistant/entities/candidate.entity";
import { CandidateJobMatch } from "../../src/cv-assistant/entities/candidate-job-match.entity";
import { ExternalJob } from "../../src/cv-assistant/entities/external-job.entity";
import {
  JobMarketSource,
  JobSourceProvider,
} from "../../src/cv-assistant/entities/job-market-source.entity";
import { SeekerApplyClick } from "../../src/cv-assistant/entities/seeker-apply-click.entity";
import { SeekerMute } from "../../src/cv-assistant/entities/seeker-mute.entity";
import { CandidateJobMatchingService } from "../../src/cv-assistant/services/candidate-job-matching.service";
import { SeekerJobFeedService } from "../../src/cv-assistant/services/seeker-job-feed.service";

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
    jobAlertsOptIn: true,
    popiaConsent: true,
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
      find: jest.fn(async ({ where }: { where: { email?: string } }) => {
        if (where?.email === seekerCandidate.email) return [seekerCandidate];
        return [];
      }),
    };
    const sourceRepo = {
      findByIds: jest.fn(async () => [adzunaSource]),
    };
    const matchRepo = {
      findOne: jest.fn(
        async ({ where }: { where: { id?: number } }) =>
          matchesStore.find((m) => m.id === where.id) ?? null,
      ),
      update: jest.fn(async (id: number) => {
        const m = matchesStore.find((mm) => mm.id === id);
        if (m) m.dismissed = true;
        return { affected: 1 };
      }),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => matchesStore.filter((m) => !m.dismissed)),
      })),
    };

    const mockMatchingService = {
      recommendedJobsForCandidate: jest.fn(async () => matchesStore.filter((m) => !m.dismissed)),
      dismissMatch: jest.fn(async (id: number) => {
        const m = matchesStore.find((mm) => mm.id === id);
        if (m) m.dismissed = true;
      }),
    };

    const muteRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
      })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (m) => ({ ...m, id: 1 })),
      delete: jest.fn(),
      create: jest.fn((m) => m),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeekerJobFeedService,
        { provide: getRepositoryToken(Candidate), useValue: candidateRepo },
        { provide: getRepositoryToken(JobMarketSource), useValue: sourceRepo },
        { provide: getRepositoryToken(CandidateJobMatch), useValue: matchRepo },
        { provide: getRepositoryToken(SeekerApplyClick), useValue: {} },
        { provide: getRepositoryToken(ExternalJob), useValue: {} },
        { provide: getRepositoryToken(SeekerMute), useValue: muteRepo },
        { provide: CandidateJobMatchingService, useValue: mockMatchingService },
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
