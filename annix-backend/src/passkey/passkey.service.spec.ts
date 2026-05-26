import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../audit/audit.service";
import { UserRepository } from "../user/user.repository";
import { PasskeyConfig } from "./passkey.config";
import { PasskeyRepository } from "./passkey.repository";
import { PasskeyService } from "./passkey.service";
import { PasskeyChallengeRepository } from "./passkey-challenge.repository";

describe("PasskeyService", () => {
  let service: PasskeyService;

  const mockPasskeyRepo = {
    findByCredentialId: jest.fn(),
    findByUserId: jest.fn(),
    countByUserId: jest.fn(),
    deleteByIdAndUserId: jest.fn(),
    create: jest.fn((p) => Promise.resolve(p)),
    save: jest.fn((p) => Promise.resolve(p)),
    findOneWhere: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockChallengeRepo = {
    findLatestForUserAndType: jest.fn(),
    findLatestForAuthenticationByUserId: jest.fn(),
    deleteById: jest.fn(),
    deleteExpiredBefore: jest.fn(),
    create: jest.fn((p) => Promise.resolve(p)),
    save: jest.fn((p) => Promise.resolve(p)),
    findById: jest.fn(),
    findAll: jest.fn(),
    findOneWhere: jest.fn(),
    findManyWhere: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockUserRepo = {
    findById: jest.fn(),
    findOneByEmail: jest.fn(),
    findByIdWithRoles: jest.fn(),
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
        { provide: PasskeyRepository, useValue: mockPasskeyRepo },
        { provide: PasskeyChallengeRepository, useValue: mockChallengeRepo },
        { provide: UserRepository, useValue: mockUserRepo },
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
      mockUserRepo.findById.mockResolvedValueOnce(null);
      await expect(service.registrationOptions(999)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("stores a challenge after generating options", async () => {
      mockUserRepo.findById.mockResolvedValueOnce({ id: 1, email: "u@example.com" });
      mockPasskeyRepo.findByUserId.mockResolvedValueOnce([]);
      mockChallengeRepo.create.mockResolvedValueOnce({});

      const options = await service.registrationOptions(1);

      expect(options.challenge).toBeDefined();
      expect(mockChallengeRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("revoke", () => {
    it("throws NotFoundException when passkey does not belong to user", async () => {
      mockPasskeyRepo.findOneWhere.mockResolvedValueOnce(null);
      await expect(service.revoke(1, 99)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("blocks removal of last passkey when no password is set", async () => {
      mockPasskeyRepo.findOneWhere.mockResolvedValueOnce({ id: 5, userId: 1 });
      mockUserRepo.findById.mockResolvedValueOnce({ id: 1, passwordHash: null });
      mockPasskeyRepo.countByUserId.mockResolvedValueOnce(1);

      await expect(service.revoke(1, 5)).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPasskeyRepo.deleteByIdAndUserId).not.toHaveBeenCalled();
    });

    it("allows removal when user still has a password fallback", async () => {
      mockPasskeyRepo.findOneWhere.mockResolvedValueOnce({ id: 5, userId: 1 });
      mockUserRepo.findById.mockResolvedValueOnce({ id: 1, passwordHash: "hash" });
      mockPasskeyRepo.countByUserId.mockResolvedValueOnce(1);
      mockPasskeyRepo.deleteByIdAndUserId.mockResolvedValueOnce(undefined);

      await service.revoke(1, 5);
      expect(mockPasskeyRepo.deleteByIdAndUserId).toHaveBeenCalledWith(5, 1);
    });

    it("allows removal when other passkeys remain", async () => {
      mockPasskeyRepo.findOneWhere.mockResolvedValueOnce({ id: 5, userId: 1 });
      mockUserRepo.findById.mockResolvedValueOnce({ id: 1, passwordHash: null });
      mockPasskeyRepo.countByUserId.mockResolvedValueOnce(3);
      mockPasskeyRepo.deleteByIdAndUserId.mockResolvedValueOnce(undefined);

      await service.revoke(1, 5);
      expect(mockPasskeyRepo.deleteByIdAndUserId).toHaveBeenCalled();
    });
  });

  describe("rename", () => {
    it("trims and persists new device name", async () => {
      const passkey = { id: 5, userId: 1, deviceName: "old" };
      mockPasskeyRepo.findOneWhere.mockResolvedValueOnce(passkey);
      mockPasskeyRepo.save.mockImplementationOnce(async (p) => p);

      const updated = await service.rename(1, 5, "  MacBook Touch ID  ");

      expect(updated.deviceName).toBe("MacBook Touch ID");
    });

    it("throws when passkey does not exist for user", async () => {
      mockPasskeyRepo.findOneWhere.mockResolvedValueOnce(null);
      await expect(service.rename(1, 99, "x")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("purgeExpiredChallenges", () => {
    it("returns the count of removed challenges", async () => {
      mockChallengeRepo.deleteExpiredBefore.mockResolvedValueOnce(7);
      const removed = await service.purgeExpiredChallenges();
      expect(removed).toBe(7);
    });

    it("treats zero return as zero", async () => {
      mockChallengeRepo.deleteExpiredBefore.mockResolvedValueOnce(0);
      const removed = await service.purgeExpiredChallenges();
      expect(removed).toBe(0);
    });
  });
});
