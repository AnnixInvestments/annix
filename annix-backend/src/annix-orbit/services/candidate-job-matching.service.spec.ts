import { Test, TestingModule } from "@nestjs/testing";
import { Candidate } from "../entities/candidate.entity";
import { CandidateJobMatch } from "../entities/candidate-job-match.entity";
import { ExternalJob } from "../entities/external-job.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CandidateJobMatchRepository } from "../repositories/candidate-job-match.repository";
import { ExternalJobRepository } from "../repositories/external-job.repository";
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
        { provide: CandidateJobMatchRepository, useValue: {} },
        { provide: CandidateRepository, useValue: {} },
        { provide: ExternalJobRepository, useValue: {} },
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

  function candidateWith(fields: string[], primaryRole: string | null): Candidate {
    return {
      workProfile: {
        shared: {
          fields,
          primaryRole,
          yearsExperience: null,
          availability: null,
          willingToTravelKm: null,
          topSkills: [],
          certifications: [],
        },
      },
    } as unknown as Candidate;
  }

  describe("calculateWorkProfileBoost", () => {
    it("returns score=null when candidate has no work profile", () => {
      const candidate = { workProfile: null } as Candidate;
      const job = {
        title: "Software Developer",
        description: "",
        canonicalCategory: "it-software",
      } as ExternalJob;
      const result = service.calculateWorkProfileBoost(candidate, job);
      expect(result.score).toBeNull();
      expect(result.fieldMatched).toBe(false);
    });

    it("returns score=null when fields is empty", () => {
      const candidate = candidateWith([], "Software Developer");
      const job = {
        title: "Software Developer",
        description: "",
        canonicalCategory: "it-software",
      } as ExternalJob;
      expect(service.calculateWorkProfileBoost(candidate, job).score).toBeNull();
    });

    it("scores an exact field match at 0.6 when the role does not match", () => {
      const candidate = candidateWith(["it-software"], "Software Developer");
      const job = {
        title: "Registered Nurse",
        description: "Ward duties",
        canonicalCategory: "it-software",
      } as ExternalJob;
      const result = service.calculateWorkProfileBoost(candidate, job);
      expect(result.fieldMatched).toBe(true);
      expect(result.roleMatched).toBe(false);
      expect(result.score).toBeCloseTo(0.6, 2);
    });

    it("scores field + role match at 1.0", () => {
      const candidate = candidateWith(["it-software"], "Software Developer");
      const job = {
        title: "Senior Software Developer",
        description: "Build web platforms",
        canonicalCategory: "it-software",
      } as ExternalJob;
      const result = service.calculateWorkProfileBoost(candidate, job);
      expect(result.fieldMatched).toBe(true);
      expect(result.roleMatched).toBe(true);
      // field=1.0 * 0.6 + role=1.0 * 0.4 = 1.0
      expect(result.score).toBeCloseTo(1.0, 2);
    });

    it("scores an adjacent field at half weight", () => {
      const candidate = candidateWith(["it-software"], null);
      const job = {
        title: "Mechanical Technologist",
        description: "",
        canonicalCategory: "engineering-technical",
      } as ExternalJob;
      const result = service.calculateWorkProfileBoost(candidate, job);
      expect(result.fieldMatched).toBe(true);
      // adjacent field=0.5 * 0.6 = 0.3
      expect(result.score).toBeCloseTo(0.3, 2);
    });

    it("returns score=0 when neither field nor role matches", () => {
      const candidate = candidateWith(["it-software"], "Software Developer");
      const job = {
        title: "Chef de Partie",
        description: "Restaurant kitchen",
        canonicalCategory: "hospitality-tourism",
      } as ExternalJob;
      const result = service.calculateWorkProfileBoost(candidate, job);
      expect(result.fieldMatched).toBe(false);
      expect(result.roleMatched).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe("distance + willingToTravelKm", () => {
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

    it("isOutsideTravelRadius=false when no work profile", () => {
      const candidate = {
        locationLat: -26.2,
        locationLon: 28.04,
        workProfile: null,
      } as Candidate;
      const job = { locationLat: -33.92, locationLon: 18.42 } as ExternalJob;
      expect(service.isOutsideTravelRadius(candidate, job)).toBe(false);
    });

    it("isOutsideTravelRadius=true when distance > willingToTravelKm", () => {
      const candidate = {
        locationLat: -26.2,
        locationLon: 28.04,
        workProfile: {
          shared: {
            fields: ["it-software"],
            primaryRole: null,
            yearsExperience: null,
            availability: null,
            willingToTravelKm: 100,
            topSkills: [],
            certifications: [],
          },
        },
      } as unknown as Candidate;
      const capeTownJob = { locationLat: -33.92, locationLon: 18.42 } as ExternalJob;
      expect(service.isOutsideTravelRadius(candidate, capeTownJob)).toBe(true);
    });

    it("isOutsideTravelRadius=false when distance is within willingToTravelKm", () => {
      const candidate = {
        locationLat: -26.2,
        locationLon: 28.04,
        workProfile: {
          shared: {
            fields: ["it-software"],
            primaryRole: null,
            yearsExperience: null,
            availability: null,
            willingToTravelKm: 100,
            topSkills: [],
            certifications: [],
          },
        },
      } as unknown as Candidate;
      const pretoriaJob = { locationLat: -25.74, locationLon: 28.19 } as ExternalJob;
      expect(service.isOutsideTravelRadius(candidate, pretoriaJob)).toBe(false);
    });
  });
});
