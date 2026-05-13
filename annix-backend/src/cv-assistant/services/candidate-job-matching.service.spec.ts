import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";
import {
  CandidateJobMatchingService,
  STRETCH_RESERVED_SLOTS,
  STRETCH_SCORE_BAND_MAX,
  STRETCH_SCORE_BAND_MIN,
} from "./candidate-job-matching.service";
import { CvNotificationService } from "./cv-notification.service";

type ScoreOnly = Pick<CandidateJobMatch, "overallScore">;

function fakeMatch(overallScore: number): ScoreOnly {
  return { overallScore } as ScoreOnly;
}

describe("CandidateJobMatchingService", () => {
  let service: CandidateJobMatchingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateJobMatchingService,
        { provide: getRepositoryToken(CandidateJobMatch), useValue: {} },
        { provide: getRepositoryToken(Candidate), useValue: {} },
        { provide: getRepositoryToken(ExternalJob), useValue: {} },
        { provide: CvNotificationService, useValue: {} },
      ],
    }).compile();
    service = module.get<CandidateJobMatchingService>(CandidateJobMatchingService);
  });

  describe("applyStretchMatchDiversity", () => {
    it("returns input unchanged when fewer than 20 total matches", () => {
      const matches = [0.95, 0.9, 0.85, 0.7, 0.65].map(fakeMatch);

      const result = service.applyStretchMatchDiversity(matches);

      expect(result).toHaveLength(5);
      expect(result.map((m) => m.overallScore)).toEqual([0.95, 0.9, 0.85, 0.7, 0.65]);
    });

    it("reserves at least STRETCH_RESERVED_SLOTS slots for stretch-band matches when available", () => {
      const highBand = Array.from({ length: 25 }, (_, i) => fakeMatch(0.95 - i * 0.005));
      const stretchBand = Array.from({ length: 8 }, (_, i) => fakeMatch(0.78 - i * 0.01));

      const all = [...highBand, ...stretchBand].sort((a, b) => b.overallScore - a.overallScore);

      const result = service.applyStretchMatchDiversity(all);

      expect(result).toHaveLength(20);
      const stretchCount = result.filter(
        (m) => m.overallScore >= STRETCH_SCORE_BAND_MIN && m.overallScore <= STRETCH_SCORE_BAND_MAX,
      ).length;
      expect(stretchCount).toBeGreaterThanOrEqual(STRETCH_RESERVED_SLOTS);
    });

    it("preserves the highest-score matches above the stretch band", () => {
      const highBand = Array.from({ length: 25 }, (_, i) => fakeMatch(0.95 - i * 0.005));
      const stretchBand = Array.from({ length: 8 }, (_, i) => fakeMatch(0.78 - i * 0.01));

      const all = [...highBand, ...stretchBand].sort((a, b) => b.overallScore - a.overallScore);

      const result = service.applyStretchMatchDiversity(all);

      const topPriorityCount = 20 - STRETCH_RESERVED_SLOTS;
      for (let i = 0; i < topPriorityCount; i++) {
        expect(result.map((m) => m.overallScore)).toContain(all[i].overallScore);
      }
    });

    it("fills with sub-stretch matches when fewer than STRETCH_RESERVED_SLOTS stretch matches exist", () => {
      const highBand = Array.from({ length: 25 }, (_, i) => fakeMatch(0.95 - i * 0.005));
      const oneStretch = [fakeMatch(0.72)];
      const lowBand = Array.from({ length: 5 }, (_, i) => fakeMatch(0.55 - i * 0.05));

      const all = [...highBand, ...oneStretch, ...lowBand].sort(
        (a, b) => b.overallScore - a.overallScore,
      );

      const result = service.applyStretchMatchDiversity(all);

      expect(result).toHaveLength(20);
      const stretchCount = result.filter(
        (m) => m.overallScore >= STRETCH_SCORE_BAND_MIN && m.overallScore <= STRETCH_SCORE_BAND_MAX,
      ).length;
      expect(stretchCount).toBe(1);
    });

    it("returns at most TOP_MATCHES_LIMIT entries", () => {
      const all = Array.from({ length: 50 }, (_, i) => fakeMatch(0.99 - i * 0.01));

      const result = service.applyStretchMatchDiversity(all);

      expect(result).toHaveLength(20);
    });

    it("returns the result sorted by overallScore descending", () => {
      const all = [
        ...Array.from({ length: 25 }, (_, i) => fakeMatch(0.95 - i * 0.005)),
        ...Array.from({ length: 8 }, (_, i) => fakeMatch(0.78 - i * 0.01)),
      ].sort((a, b) => b.overallScore - a.overallScore);

      const result = service.applyStretchMatchDiversity(all);

      const scores = result.map((m) => m.overallScore);
      const sorted = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sorted);
    });
  });

  describe("calculateTradeProfileBoost", () => {
    it("returns score=null when candidate has no trade profile", () => {
      const candidate = { tradeProfile: null } as Candidate;
      const job = {
        title: "Boilermaker on coal shutdown",
        description: "Gold mine shutdown crew",
        category: null,
      } as ExternalJob;
      const result = service.calculateTradeProfileBoost(candidate, job);
      expect(result.score).toBeNull();
      expect(result.tradeKeyMatches).toEqual([]);
    });

    it("returns score=null when tradeKeys is empty", () => {
      const candidate = {
        tradeProfile: {
          shared: {
            tradeKeys: [],
            yearsExperience: null,
            commoditiesWorked: [],
            shutdownHistory: [],
            siteRadiusKm: null,
            availability: null,
          },
          perTrade: {},
        },
      } as unknown as Candidate;
      const job = { title: "Boilermaker", description: "", category: null } as ExternalJob;
      expect(service.calculateTradeProfileBoost(candidate, job).score).toBeNull();
    });

    it("matches trade key in job title (boilermaker)", () => {
      const candidate = {
        tradeProfile: {
          shared: {
            tradeKeys: ["boilermaker"],
            yearsExperience: null,
            commoditiesWorked: [],
            shutdownHistory: [],
            siteRadiusKm: null,
            availability: null,
          },
          perTrade: {},
        },
      } as unknown as Candidate;
      const job = {
        title: "Senior Boilermaker - Shutdown Crew",
        description: "Pressure vessel work",
        category: null,
      } as ExternalJob;
      const result = service.calculateTradeProfileBoost(candidate, job);
      expect(result.tradeKeyMatches).toContain("Boilermaker");
      expect(result.score).toBeCloseTo(0.6, 2);
    });

    it("scores commodity overlap proportionally", () => {
      const candidate = {
        tradeProfile: {
          shared: {
            tradeKeys: ["boilermaker"],
            yearsExperience: null,
            commoditiesWorked: ["gold", "platinum", "coal"],
            shutdownHistory: [],
            siteRadiusKm: null,
            availability: null,
          },
          perTrade: {},
        },
      } as unknown as Candidate;
      const job = {
        title: "Boilermaker",
        description: "Coal mine shutdown crew, also some gold exposure",
        category: null,
      } as ExternalJob;
      const result = service.calculateTradeProfileBoost(candidate, job);
      expect(result.commodityMatches.sort()).toEqual(["coal", "gold"]);
      // tradeKey=1.0 * 0.6 + commodity=(2/3) * 0.4 = 0.6 + 0.2667 = 0.8667
      expect(result.score).toBeCloseTo(0.867, 2);
    });

    it("returns score=0 when nothing in candidate's profile matches the job", () => {
      const candidate = {
        tradeProfile: {
          shared: {
            tradeKeys: ["coded_welder"],
            yearsExperience: null,
            commoditiesWorked: ["gold"],
            shutdownHistory: [],
            siteRadiusKm: null,
            availability: null,
          },
          perTrade: {},
        },
      } as unknown as Candidate;
      const job = {
        title: "Marketing Manager",
        description: "Retail merchandising in Sandton",
        category: null,
      } as ExternalJob;
      const result = service.calculateTradeProfileBoost(candidate, job);
      expect(result.tradeKeyMatches).toEqual([]);
      expect(result.commodityMatches).toEqual([]);
      expect(result.score).toBe(0);
    });
  });

  describe("distance + siteRadiusKm", () => {
    it("calculateDistance returns km when both sides have coords", () => {
      const candidate = { locationLat: -26.2, locationLon: 28.04 } as Candidate;
      const job = { locationLat: -33.92, locationLon: 18.42 } as ExternalJob;
      const result = service.calculateDistance(candidate, job);
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(1250);
    });

    it("calculateDistance returns null when either side missing coords", () => {
      const candidate = { locationLat: -26.2, locationLon: null } as Candidate;
      const job = { locationLat: -33.92, locationLon: 18.42 } as ExternalJob;
      expect(service.calculateDistance(candidate, job)).toBeNull();
    });

    it("isOutsideTradeRadius=false when no tradeProfile", () => {
      const candidate = {
        locationLat: -26.2,
        locationLon: 28.04,
        tradeProfile: null,
      } as Candidate;
      const job = { locationLat: -33.92, locationLon: 18.42 } as ExternalJob;
      expect(service.isOutsideTradeRadius(candidate, job)).toBe(false);
    });

    it("isOutsideTradeRadius=true when distance > siteRadiusKm", () => {
      const candidate = {
        locationLat: -26.2,
        locationLon: 28.04,
        tradeProfile: {
          shared: {
            tradeKeys: ["coded_welder"],
            yearsExperience: null,
            commoditiesWorked: [],
            shutdownHistory: [],
            siteRadiusKm: 100,
            availability: null,
          },
          perTrade: {},
        },
      } as unknown as Candidate;
      const capeTownJob = { locationLat: -33.92, locationLon: 18.42 } as ExternalJob;
      expect(service.isOutsideTradeRadius(candidate, capeTownJob)).toBe(true);
    });

    it("isOutsideTradeRadius=false when distance is within siteRadiusKm", () => {
      const candidate = {
        locationLat: -26.2,
        locationLon: 28.04,
        tradeProfile: {
          shared: {
            tradeKeys: ["coded_welder"],
            yearsExperience: null,
            commoditiesWorked: [],
            shutdownHistory: [],
            siteRadiusKm: 100,
            availability: null,
          },
          perTrade: {},
        },
      } as unknown as Candidate;
      const pretoriaJob = { locationLat: -25.74, locationLon: 28.19 } as ExternalJob;
      expect(service.isOutsideTradeRadius(candidate, pretoriaJob)).toBe(false);
    });
  });
});
