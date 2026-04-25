import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuditService } from "../audit/audit.service";
import { User } from "../user/entities/user.entity";
import { Passkey } from "./entities/passkey.entity";
import { PasskeyChallenge } from "./entities/passkey-challenge.entity";
import { PasskeyConfig } from "./passkey.config";
import { PasskeyService } from "./passkey.service";

describe("PasskeyService", () => {
  let service: PasskeyService;

  const mockPasskeyRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    create: jest.fn((p) => p),
  };

  const mockChallengeRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    create: jest.fn((p) => p),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "WEBAUTHN_RP_ID") return "localhost";
      if (key === "WEBAUTHN_RP_NAME") return "Annix";
      if (key === "WEBAUTHN_ORIGIN") return "http://localhost:3000";
      return undefined;
    }),
  };

  const mockAuditService = {
    logApp: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasskeyService,
        PasskeyConfig,
        { provide: getRepositoryToken(Passkey), useValue: mockPasskeyRepo },
        { provide: getRepositoryToken(PasskeyChallenge), useValue: mockChallengeRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PasskeyService>(PasskeyService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("registrationOptions", () => {
    it("throws NotFoundException when user does not exist", async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.registrationOptions(999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("stores a challenge after generating options", async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 1, email: "u@example.com" });
      mockPasskeyRepo.find.mockResolvedValueOnce([]);
      mockChallengeRepo.save.mockResolvedValueOnce({});

      const options = await service.registrationOptions(1);

      expect(options.challenge).toBeDefined();
      expect(mockChallengeRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe("revoke", () => {
    it("throws NotFoundException when passkey does not belong to user", async () => {
      mockPasskeyRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.revoke(1, 99)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("blocks removal of last passkey when no password is set", async () => {
      mockPasskeyRepo.findOne.mockResolvedValueOnce({ id: 5, userId: 1 });
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 1, passwordHash: null });
      mockPasskeyRepo.count.mockResolvedValueOnce(1);

      await expect(service.revoke(1, 5)).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPasskeyRepo.delete).not.toHaveBeenCalled();
    });

    it("allows removal when user still has a password fallback", async () => {
      mockPasskeyRepo.findOne.mockResolvedValueOnce({ id: 5, userId: 1 });
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 1, passwordHash: "hash" });
      mockPasskeyRepo.count.mockResolvedValueOnce(1);
      mockPasskeyRepo.delete.mockResolvedValueOnce({ affected: 1 });

      await service.revoke(1, 5);
      expect(mockPasskeyRepo.delete).toHaveBeenCalledWith({ id: 5, userId: 1 });
    });

    it("allows removal when other passkeys remain", async () => {
      mockPasskeyRepo.findOne.mockResolvedValueOnce({ id: 5, userId: 1 });
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 1, passwordHash: null });
      mockPasskeyRepo.count.mockResolvedValueOnce(3);
      mockPasskeyRepo.delete.mockResolvedValueOnce({ affected: 1 });

      await service.revoke(1, 5);
      expect(mockPasskeyRepo.delete).toHaveBeenCalled();
    });
  });

  describe("rename", () => {
    it("trims and persists new device name", async () => {
      const passkey = { id: 5, userId: 1, deviceName: "old" };
      mockPasskeyRepo.findOne.mockResolvedValueOnce(passkey);
      mockPasskeyRepo.save.mockImplementationOnce(async (p) => p);

      const updated = await service.rename(1, 5, "  MacBook Touch ID  ");

      expect(updated.deviceName).toBe("MacBook Touch ID");
    });

    it("throws when passkey does not exist for user", async () => {
      mockPasskeyRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.rename(1, 99, "x")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("purgeExpiredChallenges", () => {
    it("returns the count of removed challenges", async () => {
      mockChallengeRepo.delete.mockResolvedValueOnce({ affected: 7 });
      const removed = await service.purgeExpiredChallenges();
      expect(removed).toBe(7);
    });

    it("treats undefined affected as zero", async () => {
      mockChallengeRepo.delete.mockResolvedValueOnce({ affected: undefined });
      const removed = await service.purgeExpiredChallenges();
      expect(removed).toBe(0);
    });
  });
});
