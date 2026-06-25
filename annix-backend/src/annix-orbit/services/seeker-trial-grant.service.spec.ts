import { BadRequestException } from "@nestjs/common";
import type { Candidate } from "../entities/candidate.entity";
import type { CandidateRepository } from "../repositories/candidate.repository";
import type { PendingSeekerTierRepository } from "../repositories/pending-seeker-tier.repository";
import type { CvAuditService } from "./cv-audit.service";
import { SeekerJobFeedService } from "./seeker-job-feed.service";

function makeService(overrides: {
  candidateRepo?: Partial<CandidateRepository>;
  pendingTierRepo?: Partial<PendingSeekerTierRepository>;
  cvAuditService?: Partial<CvAuditService>;
}) {
  const candidateRepo = {
    findByEmail: jest.fn().mockResolvedValue([]),
    setTrial: jest.fn().mockResolvedValue(undefined),
    ...overrides.candidateRepo,
  } as unknown as CandidateRepository;
  const pendingTierRepo = {
    findByEmailNormalized: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(undefined),
    ...overrides.pendingTierRepo,
  } as unknown as PendingSeekerTierRepository;
  const cvAuditService = {
    logSeekerTierGrant: jest.fn().mockResolvedValue(undefined),
    ...overrides.cvAuditService,
  } as unknown as CvAuditService;

  const service = Object.create(SeekerJobFeedService.prototype) as SeekerJobFeedService;
  Object.assign(service, {
    candidateRepo,
    pendingTierRepo,
    cvAuditService,
    logger: { log: jest.fn(), warn: jest.fn() },
  });
  return { service, candidateRepo, pendingTierRepo, cvAuditService };
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return { id: 1, email: "seeker@example.com", trialTier: null, ...overrides } as Candidate;
}

describe("SeekerJobFeedService trial-grant ceiling (issue #398 finding 8)", () => {
  describe("setPendingSeekerTier", () => {
    it("clamps trialDays above the 30-day ceiling and audits the grant", async () => {
      const { service, pendingTierRepo, cvAuditService } = makeService({});
      await service.setPendingSeekerTier("Seeker@Example.com", "hard", false, 90, 7);

      expect(pendingTierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ emailNormalized: "seeker@example.com", trialDays: 30 }),
      );
      expect(cvAuditService.logSeekerTierGrant).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ path: "pending_tier", trialDays: 30, permanent: false }),
      );
    });

    it("rejects a non-positive trialDays", async () => {
      const { service } = makeService({});
      await expect(
        service.setPendingSeekerTier("a@example.com", "hard", false, 0, 7),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects a second trial when the account already had one", async () => {
      const { service } = makeService({
        pendingTierRepo: {
          findByEmailNormalized: jest
            .fn()
            .mockResolvedValue({ trialGrantedAt: new Date(), permanent: false }),
        },
      });
      await expect(
        service.setPendingSeekerTier("a@example.com", "hard", false, 7, 7),
      ).rejects.toThrow(BadRequestException);
    });

    it("allows a permanent grant and records no trial length", async () => {
      const { service, pendingTierRepo, cvAuditService } = makeService({});
      await service.setPendingSeekerTier("a@example.com", "hard", true, 90, 7);

      expect(pendingTierRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ permanent: true, trialDays: null }),
      );
      expect(cvAuditService.logSeekerTierGrant).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ permanent: true, trialDays: null }),
      );
    });
  });

  describe("inviteSeekerTrial", () => {
    it("rejects freeDays above the ceiling rather than clamping", async () => {
      const { service } = makeService({
        candidateRepo: { findByEmail: jest.fn().mockResolvedValue([candidate()]) },
      });
      await expect(service.inviteSeekerTrial("a@example.com", "hard", 31, 7)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejects a second trial when a candidate already carries a trial tier", async () => {
      const { service } = makeService({
        candidateRepo: {
          findByEmail: jest.fn().mockResolvedValue([candidate({ trialTier: "hard" })]),
        },
      });
      await expect(service.inviteSeekerTrial("a@example.com", "hard", 7, 7)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("grants a within-ceiling trial and writes an audit entry", async () => {
      const setTrial = jest.fn().mockResolvedValue(undefined);
      const { service, cvAuditService } = makeService({
        candidateRepo: {
          findByEmail: jest.fn().mockResolvedValue([candidate()]),
          setTrial,
        },
      });
      const result = await service.inviteSeekerTrial("a@example.com", "hard", 14, 7);

      expect(setTrial).toHaveBeenCalledWith(1, "hard", expect.any(Date));
      expect(result.candidatesAffected).toBe(1);
      expect(cvAuditService.logSeekerTierGrant).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ path: "invite_trial", trialDays: 14, candidatesAffected: 1 }),
      );
    });
  });
});
