import type { User } from "../../user/entities/user.entity";
import type { UserRepository } from "../../user/user.repository";
import type { AnnixOrbitProfile } from "../entities/annix-orbit-profile.entity";
import type { Candidate } from "../entities/candidate.entity";
import type { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import type { CandidateRepository } from "../repositories/candidate.repository";
import type { OrbitTierCapabilityRepository } from "../repositories/orbit-tier-capability.repository";
import type { SeekerUsageCounterRepository } from "../repositories/seeker-usage-counter.repository";
import { SeekerJobFeedService } from "./seeker-job-feed.service";

interface Wiring {
  user?: Partial<User> | null;
  profile?: Partial<AnnixOrbitProfile> | null;
  candidates?: Candidate[];
  allowance?: number | null;
  used?: number;
}

function makeService(wiring: Wiring) {
  const user =
    wiring.user === null
      ? null
      : ({
          id: 7,
          email: "seeker@example.com",
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: null,
          whatsappVerifiedPhone: null,
          ...wiring.user,
        } as User);

  const profile =
    wiring.profile === null
      ? null
      : ({
          id: 1,
          billingStatus: "none",
          paidUntil: null,
          selectedTier: null,
          entitledTier: null,
          ...wiring.profile,
        } as AnnixOrbitProfile);

  const candidateRepo = {
    findByEmail: jest.fn().mockResolvedValue(wiring.candidates ?? []),
  } as unknown as CandidateRepository;

  const userRepo = {
    findOneByEmailAnyScope: jest.fn().mockResolvedValue(user),
    save: jest.fn().mockResolvedValue(user),
  } as unknown as UserRepository;

  const profileRepo = {
    findByUserId: jest.fn().mockResolvedValue(profile),
  } as unknown as AnnixOrbitProfileRepository;

  const tierCapabilityRepo = {
    findByTier: jest.fn().mockResolvedValue(
      wiring.allowance === undefined
        ? null
        : {
            tier: "soft",
            label: "Free",
            monthlyNixRuns: wiring.allowance,
            monthlyCvBuilds: wiring.allowance,
            features: {},
          },
    ),
  } as unknown as OrbitTierCapabilityRepository;

  const incrementCalls: Array<{ subjectId: string; operation: string }> = [];
  const usageCounterRepo = {
    getCount: jest.fn().mockResolvedValue(wiring.used ?? 0),
    increment: jest.fn().mockImplementation(async (subjectId: string, operation: string) => {
      incrementCalls.push({ subjectId, operation });
    }),
  } as unknown as SeekerUsageCounterRepository;

  const requestConsent = jest
    .fn()
    .mockResolvedValue({ requested: true, channel: "whatsapp", sentTo: "27110000000" });
  const whatsappConsentSender = { requestConsent } as unknown as {
    requestConsent: jest.Mock;
  };

  const service = Object.create(SeekerJobFeedService.prototype) as SeekerJobFeedService;
  Object.assign(service, {
    candidateRepo,
    userRepo,
    profileRepo,
    tierCapabilityRepo,
    usageCounterRepo,
    whatsappConsentSender,
    billingSettings: { enabled: jest.fn().mockResolvedValue(false) },
    logger: { log: jest.fn(), warn: jest.fn() },
    lastRematchByCandidate: new Map<number, number>(),
  });

  return { service, usageCounterRepo, incrementCalls, userRepo, whatsappConsentSender };
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 1,
    email: "seeker@example.com",
    matchTier: "soft",
    trialTier: null,
    trialEndsAt: null,
    ...overrides,
  } as Candidate;
}

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

describe("Free-tier quota bound to a proven WhatsApp number (issue #398 finding 3)", () => {
  describe("cvBuildQuotaForSeeker keying", () => {
    it("keys the counter on the normalized waId for a verified seeker", async () => {
      const { service, usageCounterRepo } = makeService({
        user: {
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedPhone: "27110000000",
        },
        candidates: [candidate()],
        allowance: 3,
        used: 1,
      });

      await service.cvBuildQuotaForSeeker("seeker@example.com");

      expect(usageCounterRepo.getCount).toHaveBeenCalledWith(
        "27110000000",
        "nix-cv-build",
        expect.any(String),
      );
    });

    it("keys the counter on the email when the proven phone no longer matches the current phone", async () => {
      const { service, usageCounterRepo } = makeService({
        user: {
          whatsappPhone: "27110009999",
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedPhone: "27110000000",
        },
        candidates: [candidate()],
        allowance: 3,
        used: 0,
      });

      await service.cvBuildQuotaForSeeker("seeker@example.com");

      expect(usageCounterRepo.getCount).toHaveBeenCalledWith(
        "seeker@example.com",
        "nix-cv-build",
        expect.any(String),
      );
    });

    it("keys the counter on the email for an unverified seeker", async () => {
      const { service, usageCounterRepo } = makeService({
        user: { whatsappPhone: "27110000000", whatsappVerifiedAt: null },
        candidates: [candidate()],
        allowance: 3,
        used: 0,
      });

      await service.cvBuildQuotaForSeeker("Seeker@Example.com");

      expect(usageCounterRepo.getCount).toHaveBeenCalledWith(
        "seeker@example.com",
        "nix-cv-build",
        expect.any(String),
      );
    });

    it("shares one waId counter across two different email registrations", async () => {
      const first = makeService({
        user: {
          email: "a@example.com",
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedPhone: "27110000000",
        },
        candidates: [candidate({ email: "a@example.com" })],
        allowance: 3,
      });
      await first.service.cvBuildQuotaForSeeker("a@example.com");

      const second = makeService({
        user: {
          email: "b@example.com",
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedPhone: "27110000000",
        },
        candidates: [candidate({ email: "b@example.com" })],
        allowance: 3,
      });
      await second.service.cvBuildQuotaForSeeker("b@example.com");

      expect(first.usageCounterRepo.getCount).toHaveBeenCalledWith(
        "27110000000",
        "nix-cv-build",
        expect.any(String),
      );
      expect(second.usageCounterRepo.getCount).toHaveBeenCalledWith(
        "27110000000",
        "nix-cv-build",
        expect.any(String),
      );
    });
  });

  describe("assertSeekerCanConsumeMeteredAction gate", () => {
    beforeEach(() => {
      process.env.ORBIT_WHATSAPP_QUOTA_GATE = "true";
    });
    afterEach(() => {
      delete process.env.ORBIT_WHATSAPP_QUOTA_GATE;
    });

    it("does not gate when the flag is off (dark by default)", async () => {
      const { service } = makeService({
        user: { whatsappVerifiedAt: null },
        candidates: [candidate()],
        allowance: 1,
      });
      delete process.env.ORBIT_WHATSAPP_QUOTA_GATE;

      await expect(
        service.assertSeekerCanConsumeMeteredAction("seeker@example.com"),
      ).resolves.toBeUndefined();
    });

    it("blocks a free, unverified seeker with whatsapp_verification_required", async () => {
      const { service } = makeService({
        user: { whatsappVerifiedAt: null },
        candidates: [candidate()],
        allowance: 1,
      });

      await expect(
        service.assertSeekerCanConsumeMeteredAction("seeker@example.com"),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: "whatsapp_verification_required" }),
      });
    });

    it("allows a verified free seeker", async () => {
      const { service } = makeService({
        user: {
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedPhone: "27110000000",
        },
        candidates: [candidate()],
        allowance: 1,
      });

      await expect(
        service.assertSeekerCanConsumeMeteredAction("seeker@example.com"),
      ).resolves.toBeUndefined();
    });

    it("blocks a seeker who changed their phone to an unproven number", async () => {
      const { service } = makeService({
        user: {
          whatsappPhone: "27110009999",
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedPhone: "27110000000",
        },
        candidates: [candidate()],
        allowance: 1,
      });

      await expect(
        service.assertSeekerCanConsumeMeteredAction("seeker@example.com"),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: "whatsapp_verification_required" }),
      });
    });

    it("does not gate a paid seeker (active billing)", async () => {
      const { service } = makeService({
        user: { whatsappVerifiedAt: null },
        profile: { billingStatus: "active" },
        candidates: [candidate()],
        allowance: 1,
      });

      await expect(
        service.assertSeekerCanConsumeMeteredAction("seeker@example.com"),
      ).resolves.toBeUndefined();
    });

    it("does not gate a trial seeker", async () => {
      const { service } = makeService({
        user: { whatsappVerifiedAt: null },
        candidates: [candidate({ trialTier: "hard", trialEndsAt: FUTURE })],
        allowance: 1,
      });

      await expect(
        service.assertSeekerCanConsumeMeteredAction("seeker@example.com"),
      ).resolves.toBeUndefined();
    });
  });

  describe("rematchForSeeker verification gate", () => {
    beforeEach(() => {
      process.env.ORBIT_WHATSAPP_QUOTA_GATE = "true";
    });
    afterEach(() => {
      delete process.env.ORBIT_WHATSAPP_QUOTA_GATE;
    });

    it("returns verification-required and does NOT increment for a free unverified seeker", async () => {
      const { service, usageCounterRepo } = makeService({
        user: { whatsappVerifiedAt: null },
        candidates: [candidate()],
        allowance: 5,
        used: 0,
      });

      const result = await service.rematchForSeeker("seeker@example.com", 7);

      expect(result).toEqual({
        triggered: false,
        reason: "verification-required",
        code: "whatsapp_verification_required",
      });
      expect(usageCounterRepo.increment).not.toHaveBeenCalled();
    });
  });

  describe("recordCvBuild keying", () => {
    it("increments on the waId for a verified seeker", async () => {
      const { service, incrementCalls } = makeService({
        user: {
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedPhone: "27110000000",
        },
        candidates: [candidate()],
        allowance: 3,
      });

      await service.recordCvBuild("seeker@example.com");

      expect(incrementCalls).toEqual([{ subjectId: "27110000000", operation: "nix-cv-build" }]);
    });
  });

  describe("requestWhatsAppVerificationForSeeker resend cooldown + phone-change reset", () => {
    it("clears verification when the seeker changes to an unproven number", async () => {
      const { service, userRepo, whatsappConsentSender } = makeService({
        user: {
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: new Date(),
          whatsappVerifiedPhone: "27110000000",
          whatsappConsentRequestedAt: null,
        },
        candidates: [candidate()],
        allowance: 3,
      });

      await service.requestWhatsAppVerificationForSeeker("seeker@example.com", "0820009999");

      const savedUser = (userRepo.save as jest.Mock).mock.calls[0][0];
      expect(savedUser.whatsappPhone).toBe("27820009999");
      expect(savedUser.whatsappVerifiedAt).toBeNull();
      expect(savedUser.whatsappVerifiedPhone).toBeNull();
      expect(whatsappConsentSender.requestConsent).toHaveBeenCalled();
    });

    it("returns a cooldown result instead of resending within the cooldown window", async () => {
      const { service, whatsappConsentSender } = makeService({
        user: {
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: null,
          whatsappVerifiedPhone: null,
          whatsappConsentRequestedAt: new Date(),
        },
        candidates: [candidate()],
        allowance: 3,
      });

      const result = await service.requestWhatsAppVerificationForSeeker(
        "seeker@example.com",
        "0821110000",
      );

      expect(result).toMatchObject({ requested: false, cooldown: true });
      expect(whatsappConsentSender.requestConsent).not.toHaveBeenCalled();
    });

    it("resends once the cooldown window has elapsed", async () => {
      const { service, whatsappConsentSender } = makeService({
        user: {
          whatsappPhone: "27110000000",
          whatsappVerifiedAt: null,
          whatsappVerifiedPhone: null,
          whatsappConsentRequestedAt: new Date(Date.now() - 10 * 60 * 1000),
        },
        candidates: [candidate()],
        allowance: 3,
      });

      await service.requestWhatsAppVerificationForSeeker("seeker@example.com", "0820001111");

      expect(whatsappConsentSender.requestConsent).toHaveBeenCalled();
    });
  });
});
