import { emptyTradeProfile, type TradeProfile } from "@annix/product-data/sa-market";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Candidate } from "../entities/candidate.entity";
import { TradeProfileService } from "./trade-profile.service";

describe("TradeProfileService", () => {
  let service: TradeProfileService;
  let repo: { find: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TradeProfileService, { provide: getRepositoryToken(Candidate), useValue: repo }],
    }).compile();
    service = module.get(TradeProfileService);
  });

  describe("forSeeker", () => {
    it("returns an empty profile when the candidate has none yet", async () => {
      repo.find.mockResolvedValue([{ id: 1, email: "a@example.com", tradeProfile: null }]);

      const result = await service.forSeeker("a@example.com");

      expect(result.candidateIds).toEqual([1]);
      expect(result.profile.shared.tradeKeys).toEqual([]);
      expect(result.profile.perTrade).toEqual({});
    });

    it("returns the persisted profile when present", async () => {
      const persisted = emptyTradeProfile();
      persisted.shared.tradeKeys = ["coded_welder"];
      persisted.shared.commoditiesWorked = ["gold", "platinum"];
      persisted.perTrade.coded_welder = {
        processes: ["GTAW"],
        positions: ["6G"],
        materialsCoded: ["SS"],
        thicknessMinMm: 3,
        thicknessMaxMm: 12,
        saqccCertificateNumber: "SAQCC-12345",
        saqccValidUntil: "2027-01-01",
      };
      repo.find.mockResolvedValue([{ id: 2, email: "w@example.com", tradeProfile: persisted }]);

      const result = await service.forSeeker("w@example.com");

      expect(result.profile.shared.tradeKeys).toEqual(["coded_welder"]);
      expect(result.profile.perTrade.coded_welder?.saqccCertificateNumber).toBe("SAQCC-12345");
    });

    it("returns empty when the seeker has no candidate row", async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.forSeeker("nobody@example.com");
      expect(result.candidateIds).toEqual([]);
      expect(result.profile.shared.tradeKeys).toEqual([]);
    });

    it("returns empty when email is null", async () => {
      const result = await service.forSeeker(null);
      expect(result.candidateIds).toEqual([]);
      expect(repo.find).not.toHaveBeenCalled();
    });
  });

  describe("upsertForSeeker", () => {
    it("persists a normalised profile to every candidate row owned by the seeker", async () => {
      repo.find.mockResolvedValue([
        { id: 3, email: "u@example.com" },
        { id: 4, email: "u@example.com" },
      ]);
      const input: TradeProfile = emptyTradeProfile();
      input.shared.tradeKeys = ["boilermaker", "boilermaker", "coded_welder"];
      input.shared.yearsExperience = 8.7;
      input.shared.siteRadiusKm = 75;
      input.shared.availability = "available_now";
      input.shared.commoditiesWorked = ["gold", "gold", "coal"];
      input.shared.shutdownHistory = [
        { siteName: " Kathu Mine ", role: "Lead Boilermaker ", durationDays: 21, year: 2025 },
      ];

      const result = await service.upsertForSeeker("u@example.com", input);

      expect(result.saved).toBe(true);
      expect(repo.update).toHaveBeenCalledTimes(2);
      const persisted = repo.update.mock.calls[0][1].tradeProfile as TradeProfile;
      expect(persisted.shared.tradeKeys).toEqual(["boilermaker", "coded_welder"]);
      expect(persisted.shared.yearsExperience).toBe(9);
      expect(persisted.shared.commoditiesWorked).toEqual(["gold", "coal"]);
      expect(persisted.shared.shutdownHistory[0].siteName).toBe("Kathu Mine");
      expect(persisted.shared.shutdownHistory[0].role).toBe("Lead Boilermaker");
    });

    it("rejects negative yearsExperience and siteRadiusKm", async () => {
      repo.find.mockResolvedValue([{ id: 5, email: "n@example.com" }]);
      const input: TradeProfile = emptyTradeProfile();
      input.shared.yearsExperience = -3;
      input.shared.siteRadiusKm = -100;

      await service.upsertForSeeker("n@example.com", input);

      const persisted = repo.update.mock.calls[0][1].tradeProfile as TradeProfile;
      expect(persisted.shared.yearsExperience).toBeNull();
      expect(persisted.shared.siteRadiusKm).toBeNull();
    });

    it("returns saved=false when the seeker has no candidate row", async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.upsertForSeeker("nobody@example.com", emptyTradeProfile());
      expect(result.saved).toBe(false);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
