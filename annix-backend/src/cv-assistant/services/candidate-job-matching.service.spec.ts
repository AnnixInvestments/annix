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
});
