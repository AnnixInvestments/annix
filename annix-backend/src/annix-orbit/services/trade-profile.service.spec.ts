import { emptyTradeProfile, type TradeProfile } from "@annix/product-data/sa-market";
import { Test, TestingModule } from "@nestjs/testing";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { CandidateRepository } from "../repositories/candidate.repository";
import { TradeProfileService } from "./trade-profile.service";

describe("TradeProfileService", () => {
  let service: TradeProfileService;
  let repo: { findByEmail: jest.Mock; updateTradeProfile: jest.Mock };
  let aiChat: { chat: jest.Mock };

  beforeEach(async () => {
    repo = {
      findByEmail: jest.fn(),
      updateTradeProfile: jest.fn().mockResolvedValue(undefined),
    };
    aiChat = { chat: jest.fn() };
    const extractionMetricService = {
      time: jest.fn((_category: string, _operation: string, fn: () => unknown) => fn()),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeProfileService,
        { provide: CandidateRepository, useValue: repo },
        { provide: AiChatService, useValue: aiChat },
        { provide: ExtractionMetricService, useValue: extractionMetricService },
      ],
    }).compile();
    service = module.get(TradeProfileService);
  });

  describe("forSeeker", () => {
    it("returns an empty profile when the candidate has none yet", async () => {
      repo.findByEmail.mockResolvedValue([{ id: 1, email: "a@example.com", tradeProfile: null }]);

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
      repo.findByEmail.mockResolvedValue([
        { id: 2, email: "w@example.com", tradeProfile: persisted },
      ]);

      const result = await service.forSeeker("w@example.com");

      expect(result.profile.shared.tradeKeys).toEqual(["coded_welder"]);
      expect(result.profile.perTrade.coded_welder?.saqccCertificateNumber).toBe("SAQCC-12345");
    });

    it("returns empty when the seeker has no candidate row", async () => {
      repo.findByEmail.mockResolvedValue([]);
      const result = await service.forSeeker("nobody@example.com");
      expect(result.candidateIds).toEqual([]);
      expect(result.profile.shared.tradeKeys).toEqual([]);
    });

    it("returns empty when email is null", async () => {
      const result = await service.forSeeker(null);
      expect(result.candidateIds).toEqual([]);
      expect(repo.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe("upsertForSeeker", () => {
    it("persists a normalised profile to every candidate row owned by the seeker", async () => {
      repo.findByEmail.mockResolvedValue([
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
      expect(repo.updateTradeProfile).toHaveBeenCalledTimes(2);
      const persisted = repo.updateTradeProfile.mock.calls[0][1] as TradeProfile;
      expect(persisted.shared.tradeKeys).toEqual(["boilermaker", "coded_welder"]);
      expect(persisted.shared.yearsExperience).toBe(9);
      expect(persisted.shared.commoditiesWorked).toEqual(["gold", "coal"]);
      expect(persisted.shared.shutdownHistory[0].siteName).toBe("Kathu Mine");
      expect(persisted.shared.shutdownHistory[0].role).toBe("Lead Boilermaker");
    });

    it("rejects negative yearsExperience and siteRadiusKm", async () => {
      repo.findByEmail.mockResolvedValue([{ id: 5, email: "n@example.com" }]);
      const input: TradeProfile = emptyTradeProfile();
      input.shared.yearsExperience = -3;
      input.shared.siteRadiusKm = -100;

      await service.upsertForSeeker("n@example.com", input);

      const persisted = repo.updateTradeProfile.mock.calls[0][1] as TradeProfile;
      expect(persisted.shared.yearsExperience).toBeNull();
      expect(persisted.shared.siteRadiusKm).toBeNull();
    });

    it("returns saved=false when the seeker has no candidate row", async () => {
      repo.findByEmail.mockResolvedValue([]);
      const result = await service.upsertForSeeker("nobody@example.com", emptyTradeProfile());
      expect(result.saved).toBe(false);
      expect(repo.updateTradeProfile).not.toHaveBeenCalled();
    });
  });

  describe("autofillFromCvForSeeker", () => {
    it("returns reason=no-candidate when seeker has no candidate row", async () => {
      repo.findByEmail.mockResolvedValue([]);
      const result = await service.autofillFromCvForSeeker("nobody@example.com");
      expect(result.extracted).toBe(false);
      expect(result.reason).toBe("no-candidate");
      expect(aiChat.chat).not.toHaveBeenCalled();
    });

    it("returns reason=no-cv-text when candidate has no rawCvText", async () => {
      repo.findByEmail.mockResolvedValue([{ id: 1, email: "a@example.com", rawCvText: null }]);
      const result = await service.autofillFromCvForSeeker("a@example.com");
      expect(result.extracted).toBe(false);
      expect(result.reason).toBe("no-cv-text");
      expect(aiChat.chat).not.toHaveBeenCalled();
    });

    it("returns reason=no-trade-keywords when CV has no trade keywords", async () => {
      repo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "a@example.com",
          rawCvText: "Marketing manager with experience in retail merchandising",
        },
      ]);
      const result = await service.autofillFromCvForSeeker("a@example.com");
      expect(result.extracted).toBe(false);
      expect(result.reason).toBe("no-trade-keywords");
      expect(aiChat.chat).not.toHaveBeenCalled();
    });

    it("calls Gemini, parses trade profile, persists, and merges with existing profile", async () => {
      const existing: TradeProfile = emptyTradeProfile();
      existing.shared.commoditiesWorked = ["gold"];
      repo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "boilie@example.com",
          rawCvText: "Senior boilermaker with 12 years pressure-vessel experience in coal mines",
          tradeProfile: existing,
        },
      ]);
      aiChat.chat.mockResolvedValue({
        content: JSON.stringify({
          shared: {
            tradeKeys: ["boilermaker"],
            yearsExperience: 12,
            commoditiesWorked: ["coal"],
            shutdownHistory: [],
            siteRadiusKm: 200,
            availability: "available_now",
          },
          perTrade: {
            boilermaker: {
              codedTickets: ["6G"],
              pressureVesselExperience: true,
              specialisations: ["heat exchanger"],
            },
          },
        }),
        providerUsed: "gemini",
        tokensUsed: 1500,
      });

      const result = await service.autofillFromCvForSeeker("boilie@example.com");

      expect(result.extracted).toBe(true);
      expect(result.profile.shared.tradeKeys).toEqual(["boilermaker"]);
      expect(result.profile.shared.commoditiesWorked.sort()).toEqual(["coal", "gold"]);
      expect(result.profile.shared.yearsExperience).toBe(12);
      expect(result.profile.perTrade.boilermaker?.codedTickets).toEqual(["6G"]);
      expect(repo.updateTradeProfile).toHaveBeenCalledTimes(1);
    });

    it("returns reason=ai-failed when Gemini returns non-JSON", async () => {
      repo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "boilie@example.com",
          rawCvText: "Senior boilermaker with 12 years experience",
        },
      ]);
      aiChat.chat.mockResolvedValue({
        content: "Sorry, I cannot help",
        providerUsed: "gemini",
        tokensUsed: 50,
      });

      const result = await service.autofillFromCvForSeeker("boilie@example.com");

      expect(result.extracted).toBe(false);
      expect(result.reason).toBe("ai-failed");
      expect(repo.updateTradeProfile).not.toHaveBeenCalled();
    });
  });
});
