import { emptyWorkProfile, type WorkProfile } from "@annix/product-data/sa-market";
import { Test, TestingModule } from "@nestjs/testing";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { CandidateRepository } from "../repositories/candidate.repository";
import { SeekerTelemetryService } from "./seeker-telemetry.service";
import { WorkProfileService } from "./work-profile.service";

describe("WorkProfileService", () => {
  let service: WorkProfileService;
  let repo: {
    findByEmail: jest.Mock;
    updateWorkProfile: jest.Mock;
    updateTargetCategories: jest.Mock;
  };
  let aiChat: { chat: jest.Mock };

  beforeEach(async () => {
    repo = {
      findByEmail: jest.fn(),
      updateWorkProfile: jest.fn().mockResolvedValue(undefined),
      updateTargetCategories: jest.fn().mockResolvedValue(undefined),
    };
    aiChat = { chat: jest.fn() };
    const extractionMetricService = {
      time: jest.fn((_category: string, _operation: string, fn: () => unknown) => fn()),
    };
    const seekerTelemetry = { record: jest.fn().mockResolvedValue(undefined) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkProfileService,
        { provide: CandidateRepository, useValue: repo },
        { provide: AiChatService, useValue: aiChat },
        { provide: ExtractionMetricService, useValue: extractionMetricService },
        { provide: SeekerTelemetryService, useValue: seekerTelemetry },
      ],
    }).compile();
    service = module.get(WorkProfileService);
  });

  describe("forSeeker", () => {
    it("returns an empty profile when the candidate has none yet", async () => {
      repo.findByEmail.mockResolvedValue([{ id: 1, email: "a@example.com", workProfile: null }]);

      const result = await service.forSeeker("a@example.com");

      expect(result.candidateIds).toEqual([1]);
      expect(result.profile.shared.fields).toEqual([]);
      expect(result.profile.shared.primaryRole).toBeNull();
    });

    it("returns the persisted profile when present", async () => {
      const persisted = emptyWorkProfile();
      persisted.shared.fields = ["it-software"];
      persisted.shared.primaryRole = "Software Developer";
      persisted.shared.topSkills = ["TypeScript", "React"];
      repo.findByEmail.mockResolvedValue([
        { id: 2, email: "w@example.com", workProfile: persisted },
      ]);

      const result = await service.forSeeker("w@example.com");

      expect(result.profile.shared.fields).toEqual(["it-software"]);
      expect(result.profile.shared.primaryRole).toBe("Software Developer");
    });

    it("returns empty when the seeker has no candidate row", async () => {
      repo.findByEmail.mockResolvedValue([]);
      const result = await service.forSeeker("nobody@example.com");
      expect(result.candidateIds).toEqual([]);
      expect(result.profile.shared.fields).toEqual([]);
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
      const input: WorkProfile = emptyWorkProfile();
      input.shared.fields = ["it-software", "it-software", "finance-accounting"];
      input.shared.primaryRole = "  Data Analyst  ";
      input.shared.yearsExperience = 8.7;
      input.shared.willingToTravelKm = 75;
      input.shared.availability = "available_now";
      input.shared.topSkills = ["SQL", "SQL", " Python "];

      const result = await service.upsertForSeeker("u@example.com", input);

      expect(result.saved).toBe(true);
      expect(repo.updateWorkProfile).toHaveBeenCalledTimes(2);
      const persisted = repo.updateWorkProfile.mock.calls[0][1] as WorkProfile;
      expect(persisted.shared.fields).toEqual(["it-software", "finance-accounting"]);
      expect(persisted.shared.primaryRole).toBe("Data Analyst");
      expect(persisted.shared.yearsExperience).toBe(9);
      expect(persisted.shared.topSkills).toEqual(["SQL", "Python"]);
      expect(repo.updateTargetCategories).toHaveBeenCalledWith(3, [
        "it-software",
        "finance-accounting",
      ]);
    });

    it("drops unknown field keys and clamps negative numbers", async () => {
      repo.findByEmail.mockResolvedValue([{ id: 5, email: "n@example.com" }]);
      const input: WorkProfile = emptyWorkProfile();
      input.shared.fields = ["it-software", "not-a-real-field"] as never;
      input.shared.yearsExperience = -3;
      input.shared.willingToTravelKm = -100;

      await service.upsertForSeeker("n@example.com", input);

      const persisted = repo.updateWorkProfile.mock.calls[0][1] as WorkProfile;
      expect(persisted.shared.fields).toEqual(["it-software"]);
      expect(persisted.shared.yearsExperience).toBeNull();
      expect(persisted.shared.willingToTravelKm).toBeNull();
    });

    it("does not sync target categories when no fields are chosen", async () => {
      repo.findByEmail.mockResolvedValue([{ id: 6, email: "e@example.com" }]);
      await service.upsertForSeeker("e@example.com", emptyWorkProfile());
      expect(repo.updateWorkProfile).toHaveBeenCalledTimes(1);
      expect(repo.updateTargetCategories).not.toHaveBeenCalled();
    });

    it("returns saved=false when the seeker has no candidate row", async () => {
      repo.findByEmail.mockResolvedValue([]);
      const result = await service.upsertForSeeker("nobody@example.com", emptyWorkProfile());
      expect(result.saved).toBe(false);
      expect(repo.updateWorkProfile).not.toHaveBeenCalled();
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

    it("runs the AI for any field — a non-trade CV is no longer rejected", async () => {
      repo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "mkt@example.com",
          rawCvText: "Marketing manager with experience in retail merchandising",
        },
      ]);
      aiChat.chat.mockResolvedValue({
        content: JSON.stringify({
          shared: {
            fields: ["sales-marketing"],
            primaryRole: "Marketing Manager",
            yearsExperience: 6,
            availability: "30d_notice",
            willingToTravelKm: null,
            topSkills: ["SEO", "Brand strategy"],
            certifications: [],
          },
        }),
        providerUsed: "gemini",
        tokensUsed: 1200,
      });

      const result = await service.autofillFromCvForSeeker("mkt@example.com");

      expect(aiChat.chat).toHaveBeenCalledTimes(1);
      expect(result.extracted).toBe(true);
      expect(result.profile.shared.fields).toEqual(["sales-marketing"]);
      expect(result.profile.shared.primaryRole).toBe("Marketing Manager");
      expect(repo.updateWorkProfile).toHaveBeenCalledTimes(1);
    });

    it("parses, persists and merges with the existing profile", async () => {
      const existing: WorkProfile = emptyWorkProfile();
      existing.shared.fields = ["it-software"];
      existing.shared.topSkills = ["TypeScript"];
      repo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "dev@example.com",
          rawCvText: "Full stack developer with 8 years building web platforms",
          workProfile: existing,
        },
      ]);
      aiChat.chat.mockResolvedValue({
        content: JSON.stringify({
          shared: {
            fields: ["engineering-technical"],
            primaryRole: "Full Stack Developer",
            yearsExperience: 8,
            availability: "available_now",
            willingToTravelKm: 50,
            topSkills: ["React"],
            certifications: ["AWS Certified"],
          },
        }),
        providerUsed: "gemini",
        tokensUsed: 1500,
      });

      const result = await service.autofillFromCvForSeeker("dev@example.com");

      expect(result.extracted).toBe(true);
      expect(result.profile.shared.fields.sort()).toEqual(["engineering-technical", "it-software"]);
      expect(result.profile.shared.topSkills.sort()).toEqual(["React", "TypeScript"]);
      expect(result.profile.shared.yearsExperience).toBe(8);
      expect(repo.updateWorkProfile).toHaveBeenCalledTimes(1);
    });

    it("returns reason=ai-failed when Gemini returns non-JSON", async () => {
      repo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "dev@example.com",
          rawCvText: "Full stack developer with 8 years experience",
        },
      ]);
      aiChat.chat.mockResolvedValue({
        content: "Sorry, I cannot help",
        providerUsed: "gemini",
        tokensUsed: 50,
      });

      const result = await service.autofillFromCvForSeeker("dev@example.com");

      expect(result.extracted).toBe(false);
      expect(result.reason).toBe("ai-failed");
      expect(repo.updateWorkProfile).not.toHaveBeenCalled();
    });
  });
});
