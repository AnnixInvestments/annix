import type { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import type { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import type { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import type { AnnixOrbitTalentCredentialRepository } from "../repositories/annix-orbit-talent-credential.repository";
import { AnnixOrbitRecruiterAssistantService } from "./annix-orbit-recruiter-assistant.service";

const COMPANY = 10;
const USER = 3;

function makeService() {
  const chat = jest.fn();
  const aiChatService = { chat } as unknown as jest.Mocked<AiChatService>;
  const candidateRepo = {
    findByIdForCompany: jest.fn(),
    findVisibleForCompany: jest.fn(),
  } as unknown as jest.Mocked<AnnixOrbitTalentCandidateRepository>;
  const credentialRepo = {
    findByCandidate: jest.fn(),
    listForCandidates: jest.fn(),
  } as unknown as jest.Mocked<AnnixOrbitTalentCredentialRepository>;
  const metrics = {
    time: jest.fn((_c: string, _o: string, fn: () => unknown) => fn()),
  } as unknown as jest.Mocked<ExtractionMetricService>;
  const service = new AnnixOrbitRecruiterAssistantService(
    aiChatService,
    candidateRepo,
    credentialRepo,
    metrics,
  );
  return { service, chat, candidateRepo, credentialRepo };
}

const candidate = (overrides: Record<string, unknown>) => ({
  id: 1,
  companyId: COMPANY,
  fullName: "Test Candidate",
  currentRole: "Boilermaker",
  province: "Gauteng",
  city: "Johannesburg",
  skills: ["welding"],
  availability: "Immediate",
  ...overrides,
});

const validCred = (candidateId: number) => ({
  id: candidateId * 10,
  candidateId,
  credentialType: "medical",
  expiresAt: "2999-01-01",
  verified: true,
});

describe("AnnixOrbitRecruiterAssistantService (issue #362 phase 5)", () => {
  describe("complianceGapAnalysis", () => {
    it("returns no_passport without calling the AI when there are no credentials", async () => {
      const { service, chat, candidateRepo, credentialRepo } = makeService();
      candidateRepo.findByIdForCompany.mockResolvedValue(candidate({}) as never);
      credentialRepo.findByCandidate.mockResolvedValue([]);

      const result = await service.complianceGapAnalysis(1, COMPANY);
      expect(result.status).toBe("no_passport");
      expect(result.score).toBe(0);
      expect(chat).not.toHaveBeenCalled();
    });

    it("narrates computed gaps via the AI for a candidate with credentials", async () => {
      const { service, chat, candidateRepo, credentialRepo } = makeService();
      candidateRepo.findByIdForCompany.mockResolvedValue(candidate({}) as never);
      credentialRepo.findByCandidate.mockResolvedValue([
        {
          id: 1,
          candidateId: 1,
          credentialType: "working_at_heights",
          expiresAt: "2000-01-01",
          verified: true,
        },
      ] as never);
      chat.mockResolvedValue({
        content: '{"summary":"One expired ticket.","suggestions":["Renew working at heights"]}',
        providerUsed: "gemini",
      });

      const result = await service.complianceGapAnalysis(1, COMPANY);
      expect(result.gaps).toHaveLength(1);
      expect(result.gaps[0].status).toBe("expired");
      expect(result.summary).toBe("One expired ticket.");
      expect(result.suggestions).toEqual(["Renew working at heights"]);
    });

    it("falls back to a deterministic summary when the AI call fails", async () => {
      const { service, chat, candidateRepo, credentialRepo } = makeService();
      candidateRepo.findByIdForCompany.mockResolvedValue(candidate({}) as never);
      credentialRepo.findByCandidate.mockResolvedValue([validCred(1)] as never);
      chat.mockRejectedValue(new Error("ai down"));

      const result = await service.complianceGapAnalysis(1, COMPANY);
      expect(result.summary).toContain("Site-ready score");
      expect(result.suggestions).toEqual([]);
    });
  });

  describe("findCandidates", () => {
    it("parses intent, filters by role + province, and ranks site-ready first", async () => {
      const { service, chat, candidateRepo, credentialRepo } = makeService();
      chat.mockResolvedValue({
        content:
          '{"roleKeywords":["boilermaker"],"skillKeywords":[],"province":"Gauteng","city":null,"availabilityNote":null,"requireSiteReady":true,"limit":10}',
        providerUsed: "gemini",
      });
      candidateRepo.findVisibleForCompany.mockResolvedValue([
        candidate({ id: 1, fullName: "Ready Boilermaker", province: "Gauteng" }),
        candidate({ id: 2, fullName: "Unready Boilermaker", province: "Gauteng" }),
        candidate({
          id: 3,
          fullName: "Cape Welder",
          currentRole: "Welder",
          province: "Western Cape",
        }),
      ] as never);
      credentialRepo.listForCandidates.mockResolvedValue([validCred(1)] as never);

      const result = await service.findCandidates(
        COMPANY,
        USER,
        "site-ready boilermakers in Gauteng",
      );

      // id 3 filtered out (no boilermaker keyword); id 2 filtered out (not site-ready); id 1 kept
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].candidateId).toBe(1);
      expect(result.candidates[0].siteReadyStatus).toBe("ready");
      expect(result.criteria.requireSiteReady).toBe(true);
      expect(result.criteria.province).toBe("Gauteng");
    });

    it("falls back to treating the query as a role keyword when parsing fails", async () => {
      const { service, chat, candidateRepo, credentialRepo } = makeService();
      chat.mockRejectedValue(new Error("ai down"));
      candidateRepo.findVisibleForCompany.mockResolvedValue([
        candidate({ id: 1, currentRole: "Rigger" }),
      ] as never);
      credentialRepo.listForCandidates.mockResolvedValue([]);

      const result = await service.findCandidates(COMPANY, USER, "rigger");
      expect(result.criteria.roleKeywords).toEqual(["rigger"]);
      expect(result.candidates).toHaveLength(1);
    });
  });
});
