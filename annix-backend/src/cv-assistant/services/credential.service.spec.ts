import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { EmailService } from "../../email/email.service";
import { DateTime } from "../../lib/datetime";
import { Candidate } from "../entities/candidate.entity";
import { CvCredential } from "../entities/cv-credential.entity";
import { CredentialService } from "./credential.service";

describe("CredentialService", () => {
  let service: CredentialService;
  let credentialRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let candidateRepo: { find: jest.Mock };
  let emailService: { sendEmail: jest.Mock };

  beforeEach(async () => {
    credentialRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(async (entity) => ({ id: 1, ...entity })),
      create: jest.fn((dto) => dto),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };
    candidateRepo = { find: jest.fn() };
    emailService = { sendEmail: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialService,
        { provide: getRepositoryToken(CvCredential), useValue: credentialRepo },
        { provide: getRepositoryToken(Candidate), useValue: candidateRepo },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();
    service = module.get(CredentialService);
  });

  describe("createForSeeker", () => {
    it("returns null when seeker has no candidate row", async () => {
      candidateRepo.find.mockResolvedValue([]);
      const result = await service.createForSeeker("nobody@example.com", {
        credentialType: "medical",
        issuedAt: "2025-01-01",
        expiresAt: "2026-01-01",
        issuingAuthority: "Dr Bones",
        documentPath: null,
        notes: null,
      });
      expect(result).toBeNull();
      expect(credentialRepo.save).not.toHaveBeenCalled();
    });

    it("rejects an unknown credential type", async () => {
      candidateRepo.find.mockResolvedValue([{ id: 1, email: "a@example.com" }]);
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
      candidateRepo.find.mockResolvedValue([{ id: 1, email: "a@example.com" }]);
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
      candidateRepo.find.mockResolvedValue([{ id: 5, email: "a@example.com" }]);
      credentialRepo.findOne.mockResolvedValue({ id: 7, candidateId: 99 });
      const result = await service.updateForSeeker("a@example.com", 7, { expiresAt: "2027-01-01" });
      expect(result).toBeNull();
    });

    it("updates only provided fields", async () => {
      candidateRepo.find.mockResolvedValue([{ id: 5, email: "a@example.com" }]);
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
      credentialRepo.findOne.mockResolvedValue(existing);

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
      candidateRepo.find.mockResolvedValue([{ id: 5, email: "a@example.com" }]);
      credentialRepo.findOne.mockResolvedValue({ id: 7, candidateId: 99 });
      expect(await service.deleteForSeeker("a@example.com", 7)).toBe(false);
      expect(credentialRepo.delete).not.toHaveBeenCalled();
    });

    it("deletes when owned", async () => {
      candidateRepo.find.mockResolvedValue([{ id: 5, email: "a@example.com" }]);
      credentialRepo.findOne.mockResolvedValue({ id: 7, candidateId: 5 });
      expect(await service.deleteForSeeker("a@example.com", 7)).toBe(true);
      expect(credentialRepo.delete).toHaveBeenCalledWith(7);
    });
  });

  describe("dispatchExpiryReminders", () => {
    it("sends an email when a credential is expiring in 30 days", async () => {
      const target = DateTime.now().startOf("day").plus({ days: 30 }).toISODate();
      candidateRepo.find.mockResolvedValue([
        { id: 1, email: "boilie@example.com", name: "Boilie" },
      ]);
      credentialRepo.find.mockImplementation(async (opts: { where: { expiresAt: unknown } }) => {
        const where = opts.where.expiresAt as { _value?: unknown[] };
        const isMatch = JSON.stringify(where).includes(target ?? "");
        if (isMatch) {
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
      credentialRepo.find.mockResolvedValue([]);
      candidateRepo.find.mockResolvedValue([]);
      const result = await service.dispatchExpiryReminders();
      expect(result.sent).toBe(0);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });
});
