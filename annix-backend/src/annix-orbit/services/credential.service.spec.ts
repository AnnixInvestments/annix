import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "../../email/email.service";
import { DateTime } from "../../lib/datetime";
import { ExtractionMetricService } from "../../metrics/extraction-metric.service";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { CvCredential } from "../entities/cv-credential.entity";
import { CandidateRepository } from "../repositories/candidate.repository";
import { CvCredentialRepository } from "../repositories/cv-credential.repository";
import { OrbitCredentialTypeRepository } from "../repositories/orbit-credential-type.repository";
import { CredentialService } from "./credential.service";

describe("CredentialService", () => {
  let service: CredentialService;
  let credentialRepo: {
    findById: jest.Mock;
    findByCandidate: jest.Mock;
    listForCandidates: jest.Mock;
    expiringBetween: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    deleteById: jest.Mock;
  };
  let candidateRepo: { findByEmail: jest.Mock; findById: jest.Mock };
  let emailService: { sendEmail: jest.Mock };
  let aiChat: { chat: jest.Mock };

  beforeEach(async () => {
    credentialRepo = {
      findById: jest.fn(),
      findByCandidate: jest.fn().mockResolvedValue([]),
      listForCandidates: jest.fn().mockResolvedValue([]),
      expiringBetween: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (entity) => ({ id: 1, ...entity })),
      create: jest.fn(async (dto) => ({ id: 1, ...dto })),
      deleteById: jest.fn(),
    };
    candidateRepo = { findByEmail: jest.fn(), findById: jest.fn() };
    emailService = { sendEmail: jest.fn().mockResolvedValue(true) };
    aiChat = { chat: jest.fn() };
    const extractionMetricService = {
      time: jest.fn((_category: string, _operation: string, fn: () => unknown) => fn()),
    };
    const credentialTypeRepo = { findByCode: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        { provide: CvCredentialRepository, useValue: credentialRepo },
        { provide: CandidateRepository, useValue: candidateRepo },
        { provide: EmailService, useValue: emailService },
        { provide: AiChatService, useValue: aiChat },
        { provide: ExtractionMetricService, useValue: extractionMetricService },
        { provide: OrbitCredentialTypeRepository, useValue: credentialTypeRepo },
      ],
    }).compile();
    service = module.get(CredentialService);
  });

  describe("createForSeeker", () => {
    it("returns null when seeker has no candidate row", async () => {
      candidateRepo.findByEmail.mockResolvedValue([]);
      const result = await service.createForSeeker("nobody@example.com", {
        credentialType: "medical",
        issuedAt: "2025-01-01",
        expiresAt: "2026-01-01",
        issuingAuthority: "Dr Bones",
        documentPath: null,
        notes: null,
      });
      expect(result).toBeNull();
      expect(credentialRepo.create).not.toHaveBeenCalled();
    });

    it("rejects an unknown credential type", async () => {
      candidateRepo.findByEmail.mockResolvedValue([{ id: 1, email: "a@example.com" }]);
      const result = await service.createForSeeker("a@example.com", {
        credentialType: "definitely-not-a-cred" as unknown as "medical",
        issuedAt: null,
        expiresAt: null,
        issuingAuthority: null,
        documentPath: null,
        notes: null,
      });
      expect(result).toBeNull();
    });

    it("trims issuingAuthority + notes before save", async () => {
      candidateRepo.findByEmail.mockResolvedValue([{ id: 1, email: "a@example.com" }]);
      await service.createForSeeker("a@example.com", {
        credentialType: "mine_induction",
        issuedAt: "2025-03-01",
        expiresAt: "2026-03-01",
        issuingAuthority: "  Kathu Mine HSE  ",
        documentPath: null,
        notes: "  pre-induction done  ",
      });
      const saved = credentialRepo.create.mock.calls[0][0] as CvCredential;
      expect(saved.issuingAuthority).toBe("Kathu Mine HSE");
      expect(saved.notes).toBe("pre-induction done");
    });
  });

  describe("updateForSeeker", () => {
    it("returns null when the credential is not owned by the seeker", async () => {
      candidateRepo.findByEmail.mockResolvedValue([{ id: 5, email: "a@example.com" }]);
      credentialRepo.findById.mockResolvedValue({ id: 7, candidateId: 99 });
      const result = await service.updateForSeeker("a@example.com", 7, { expiresAt: "2027-01-01" });
      expect(result).toBeNull();
    });

    it("updates only provided fields", async () => {
      candidateRepo.findByEmail.mockResolvedValue([{ id: 5, email: "a@example.com" }]);
      const existing = {
        id: 7,
        candidateId: 5,
        credentialType: "blasting",
        issuedAt: "2025-01-01",
        expiresAt: "2025-12-31",
        issuingAuthority: "Old Auth",
        documentPath: null,
        notes: null,
      };
      credentialRepo.findById.mockResolvedValue(existing);

      await service.updateForSeeker("a@example.com", 7, {
        expiresAt: "2027-01-01",
        issuingAuthority: " New Auth ",
      });

      expect(credentialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 7,
          expiresAt: "2027-01-01",
          issuingAuthority: "New Auth",
          credentialType: "blasting",
        }),
      );
    });
  });

  describe("deleteForSeeker", () => {
    it("returns false for credentials not owned by the seeker", async () => {
      candidateRepo.findByEmail.mockResolvedValue([{ id: 5, email: "a@example.com" }]);
      credentialRepo.findById.mockResolvedValue({ id: 7, candidateId: 99 });
      expect(await service.deleteForSeeker("a@example.com", 7)).toBe(false);
      expect(credentialRepo.deleteById).not.toHaveBeenCalled();
    });

    it("deletes when owned", async () => {
      candidateRepo.findByEmail.mockResolvedValue([{ id: 5, email: "a@example.com" }]);
      credentialRepo.findById.mockResolvedValue({ id: 7, candidateId: 5 });
      expect(await service.deleteForSeeker("a@example.com", 7)).toBe(true);
      expect(credentialRepo.deleteById).toHaveBeenCalledWith(7);
    });
  });

  describe("dispatchExpiryReminders", () => {
    it("sends an email when a credential is expiring in 30 days", async () => {
      const target = DateTime.now().startOf("day").plus({ days: 30 }).toISODate();
      candidateRepo.findById.mockResolvedValue({
        id: 1,
        email: "boilie@example.com",
        name: "Boilie",
      });
      credentialRepo.expiringBetween.mockImplementation(async (dayStart: string) => {
        if (dayStart === target) {
          return [
            { id: 9, candidateId: 1, credentialType: "medical", expiresAt: target } as CvCredential,
          ];
        }
        return [];
      });

      const result = await service.dispatchExpiryReminders();
      expect(result.sent).toBe(1);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      const args = emailService.sendEmail.mock.calls[0][0];
      expect(args.to).toBe("boilie@example.com");
      expect(args.subject).toContain("30");
    });

    it("returns sent=0 when no credentials expire in the reminder windows", async () => {
      credentialRepo.expiringBetween.mockResolvedValue([]);
      const result = await service.dispatchExpiryReminders();
      expect(result.sent).toBe(0);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("autofillFromCvForSeeker", () => {
    it("returns reason=no-candidate when seeker has no candidate row", async () => {
      candidateRepo.findByEmail.mockResolvedValue([]);
      const result = await service.autofillFromCvForSeeker("nobody@example.com");
      expect(result.created).toBe(0);
      expect(result.reason).toBe("no-candidate");
      expect(aiChat.chat).not.toHaveBeenCalled();
    });

    it("returns reason=no-cv-text when candidate has no rawCvText", async () => {
      candidateRepo.findByEmail.mockResolvedValue([
        { id: 1, email: "a@example.com", rawCvText: null },
      ]);
      const result = await service.autofillFromCvForSeeker("a@example.com");
      expect(result.created).toBe(0);
      expect(result.reason).toBe("no-cv-text");
      expect(aiChat.chat).not.toHaveBeenCalled();
    });

    it("returns reason=no-credential-keywords when CV has no relevant terms", async () => {
      candidateRepo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "a@example.com",
          rawCvText: "Marketing manager with retail merchandising experience",
        },
      ]);
      const result = await service.autofillFromCvForSeeker("a@example.com");
      expect(result.created).toBe(0);
      expect(result.reason).toBe("no-credential-keywords");
      expect(aiChat.chat).not.toHaveBeenCalled();
    });

    it("calls Gemini, parses credentials, and saves new ones (skipping duplicates)", async () => {
      candidateRepo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "boilie@example.com",
          rawCvText:
            "Boilermaker with valid mine induction (2026-01-15) at Kathu Mine HSE and current medical",
        },
      ]);
      credentialRepo.findByCandidate.mockResolvedValue([
        {
          id: 99,
          candidateId: 1,
          credentialType: "mine_induction",
          issuingAuthority: "Kathu Mine HSE",
        },
      ]);
      aiChat.chat.mockResolvedValue({
        content: JSON.stringify({
          credentials: [
            {
              credentialType: "mine_induction",
              issuedAt: "2026-01-15",
              expiresAt: "2027-01-15",
              issuingAuthority: "Kathu Mine HSE",
            },
            {
              credentialType: "medical",
              issuedAt: "2025-12-01",
              expiresAt: "2026-12-01",
              issuingAuthority: "Dr Bones",
            },
          ],
        }),
        providerUsed: "gemini",
        tokensUsed: 800,
      });

      const result = await service.autofillFromCvForSeeker("boilie@example.com");

      expect(result.created).toBe(1);
      expect(credentialRepo.create).toHaveBeenCalledTimes(1);
      const saved = credentialRepo.create.mock.calls[0][0];
      expect(saved.credentialType).toBe("medical");
      expect(saved.issuingAuthority).toBe("Dr Bones");
    });

    it("returns reason=ai-failed when Gemini returns non-JSON", async () => {
      candidateRepo.findByEmail.mockResolvedValue([
        {
          id: 1,
          email: "boilie@example.com",
          rawCvText: "Boilermaker with medical and mine induction",
        },
      ]);
      aiChat.chat.mockResolvedValue({
        content: "I can't help with that",
        providerUsed: "gemini",
        tokensUsed: 30,
      });

      const result = await service.autofillFromCvForSeeker("boilie@example.com");
      expect(result.created).toBe(0);
      expect(result.reason).toBe("ai-failed");
      expect(credentialRepo.create).not.toHaveBeenCalled();
    });
  });
});
