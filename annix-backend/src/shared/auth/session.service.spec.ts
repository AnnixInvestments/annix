import { Test, TestingModule } from "@nestjs/testing";
import type { PersistedEntity } from "../../lib/persistence/crud-repository";
import { AUTH_CONSTANTS } from "./auth.constants";
import type { AuthSessionRepository } from "./auth-session.repository";
import { SessionService } from "./session.service";

interface MockSession extends PersistedEntity {
  id: number;
  profileId: number;
  sessionToken: string;
  refreshToken: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  expiresAt: Date;
  lastActivity: Date;
  invalidatedAt?: Date;
  invalidationReason?: string;
}

describe("SessionService", () => {
  let service: SessionService;
  let mockRepository: jest.Mocked<AuthSessionRepository<MockSession>>;

  const mockSessionData = {
    profileId: 100,
    profileIdField: "profileId" as const,
    deviceFingerprint: "fp-abc123",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0 Test Browser",
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findOneWhere: jest.fn(),
      findManyWhere: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      findActiveByToken: jest.fn(),
      updateActiveByProfile: jest.fn(),
    } as unknown as jest.Mocked<AuthSessionRepository<MockSession>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createSession", () => {
    it("should create session data with tokens", () => {
      const result = service.createSession<MockSession, "profileId">(mockSessionData);

      expect(result.sessionData).toBeTruthy();
      expect(result.sessionToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.sessionToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(result.refreshToken).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it("should generate unique tokens for each call", () => {
      const result1 = service.createSession<MockSession, "profileId">(mockSessionData);
      const result2 = service.createSession<MockSession, "profileId">(mockSessionData);

      expect(result1.sessionToken).not.toBe(result2.sessionToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });

    it("should create session data with correct profile ID field", () => {
      const result = service.createSession<MockSession, "profileId">(mockSessionData);

      expect(result.sessionData).toHaveProperty("profileId", 100);
    });

    it("should create session data with device info", () => {
      const result = service.createSession<MockSession, "profileId">(mockSessionData);

      expect(result.sessionData).toHaveProperty("deviceFingerprint", "fp-abc123");
      expect(result.sessionData).toHaveProperty("ipAddress", "192.168.1.1");
      expect(result.sessionData).toHaveProperty("userAgent", "Mozilla/5.0 Test Browser");
    });

    it("should create session data with isActive true", () => {
      const result = service.createSession<MockSession, "profileId">(mockSessionData);

      expect(result.sessionData).toHaveProperty("isActive", true);
    });

    it("should set expiry time based on AUTH_CONSTANTS", () => {
      const beforeCreate = new Date();
      const result = service.createSession<MockSession, "profileId">(mockSessionData);
      const afterCreate = new Date();

      const expiresAt = (result.sessionData as Record<string, Date>).expiresAt;
      const minExpiry = new Date(
        beforeCreate.getTime() + AUTH_CONSTANTS.SESSION_EXPIRY_HOURS * 60 * 60 * 1000 - 1000,
      );
      const maxExpiry = new Date(
        afterCreate.getTime() + AUTH_CONSTANTS.SESSION_EXPIRY_HOURS * 60 * 60 * 1000 + 1000,
      );

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(minExpiry.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(maxExpiry.getTime());
    });

    it("should set lastActivity to current time", () => {
      const beforeCreate = new Date();
      const result = service.createSession<MockSession, "profileId">(mockSessionData);
      const afterCreate = new Date();

      const lastActivity = (result.sessionData as Record<string, Date>).lastActivity;
      expect(lastActivity.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
      expect(lastActivity.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
    });

    it("should work with different profile ID field names", () => {
      const data = {
        profileId: 50,
        profileIdField: "customerId" as const,
        deviceFingerprint: "fp",
        ipAddress: "127.0.0.1",
        userAgent: "Test",
      };

      const result = service.createSession<MockSession, "customerId">(data);

      expect(result.sessionData).toHaveProperty("customerId", 50);
    });
  });

  describe("validateSession", () => {
    const createMockSession = (overrides: Partial<MockSession> = {}): MockSession => ({
      id: 1,
      profileId: 100,
      sessionToken: "test-token",
      refreshToken: "refresh-token",
      deviceFingerprint: "fp",
      ipAddress: "192.168.1.1",
      userAgent: "Test Browser",
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000),
      lastActivity: new Date(),
      ...overrides,
    });

    it("should return session when valid and not expired", async () => {
      const mockSession = createMockSession();
      mockRepository.findActiveByToken.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(mockSession);

      const result = await service.validateSession(mockRepository, "test-token");

      expect(result).toBe(mockSession);
      expect(mockRepository.findActiveByToken).toHaveBeenCalledWith("test-token", undefined);
    });

    it("should return null when session not found", async () => {
      mockRepository.findActiveByToken.mockResolvedValue(null);

      const result = await service.validateSession(mockRepository, "invalid-token");

      expect(result).toBeNull();
    });

    it("should return null and invalidate expired session", async () => {
      const expiredSession = createMockSession({
        expiresAt: new Date(Date.now() - 1000),
      });
      mockRepository.findActiveByToken.mockResolvedValue(expiredSession);
      mockRepository.save.mockResolvedValue(expiredSession);

      const result = await service.validateSession(mockRepository, "expired-token");

      expect(result).toBeNull();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(expiredSession.isActive).toBe(false);
      expect(expiredSession.invalidationReason).toBe("EXPIRED");
    });

    it("should update lastActivity on valid session", async () => {
      const mockSession = createMockSession({
        lastActivity: new Date(Date.now() - 60000),
      });
      const originalLastActivity = mockSession.lastActivity;
      mockRepository.findActiveByToken.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(mockSession);

      await service.validateSession(mockRepository, "test-token");

      expect(mockSession.lastActivity.getTime()).toBeGreaterThan(originalLastActivity.getTime());
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should pass relations to findActiveByToken when provided", async () => {
      mockRepository.findActiveByToken.mockResolvedValue(null);

      await service.validateSession(mockRepository, "token", ["profile", "profile.user"]);

      expect(mockRepository.findActiveByToken).toHaveBeenCalledWith("token", [
        "profile",
        "profile.user",
      ]);
    });
  });

  describe("invalidateAllSessions", () => {
    it("should update all active sessions for profile", async () => {
      mockRepository.updateActiveByProfile.mockResolvedValue(undefined);

      await service.invalidateAllSessions(mockRepository, 100, "profileId", "LOGOUT_ALL");

      expect(mockRepository.updateActiveByProfile).toHaveBeenCalledWith(
        "profileId",
        100,
        expect.objectContaining({
          isActive: false,
          invalidationReason: "LOGOUT_ALL",
          invalidatedAt: expect.any(Date),
        }),
      );
    });

    it("should work with different profile ID field", async () => {
      mockRepository.updateActiveByProfile.mockResolvedValue(undefined);

      await service.invalidateAllSessions(mockRepository, 50, "customerId", "PASSWORD_CHANGE");

      expect(mockRepository.updateActiveByProfile).toHaveBeenCalledWith(
        "customerId",
        50,
        expect.objectContaining({
          isActive: false,
          invalidationReason: "PASSWORD_CHANGE",
        }),
      );
    });
  });

  describe("invalidateSession", () => {
    const createMockSession = (overrides: Partial<MockSession> = {}): MockSession => ({
      id: 1,
      profileId: 100,
      sessionToken: "test-token",
      refreshToken: "refresh-token",
      deviceFingerprint: "fp",
      ipAddress: "192.168.1.1",
      userAgent: "Test Browser",
      isActive: true,
      expiresAt: new Date(Date.now() + 3600000),
      lastActivity: new Date(),
      ...overrides,
    });

    it("should invalidate session and return it", async () => {
      const mockSession = createMockSession();
      mockRepository.findActiveByToken.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(mockSession);

      const result = await service.invalidateSession(mockRepository, "test-token", "USER_LOGOUT");

      expect(result).toBe(mockSession);
      expect(mockSession.isActive).toBe(false);
      expect(mockSession.invalidationReason).toBe("USER_LOGOUT");
      expect(mockSession.invalidatedAt).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should return null when session not found", async () => {
      mockRepository.findActiveByToken.mockResolvedValue(null);

      const result = await service.invalidateSession(
        mockRepository,
        "invalid-token",
        "USER_LOGOUT",
      );

      expect(result).toBeNull();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it("should search for active sessions only", async () => {
      mockRepository.findActiveByToken.mockResolvedValue(null);

      await service.invalidateSession(mockRepository, "test-token", "LOGOUT");

      expect(mockRepository.findActiveByToken).toHaveBeenCalledWith("test-token");
    });
  });

  describe("updateSessionToken", () => {
    it("should update session token and extend expiry", async () => {
      mockRepository.updateActiveByProfile.mockResolvedValue(undefined);

      const beforeUpdate = new Date();
      await service.updateSessionToken(mockRepository, 100, "profileId", "new-token");
      const afterUpdate = new Date();

      expect(mockRepository.updateActiveByProfile).toHaveBeenCalledWith(
        "profileId",
        100,
        expect.objectContaining({
          sessionToken: "new-token",
          lastActivity: expect.any(Date),
          expiresAt: expect.any(Date),
        }),
      );

      const updateCall = mockRepository.updateActiveByProfile.mock.calls[0][2] as Record<
        string,
        Date
      >;
      const expiresAt = updateCall.expiresAt;
      const minExpiry = new Date(
        beforeUpdate.getTime() + AUTH_CONSTANTS.SESSION_EXPIRY_HOURS * 60 * 60 * 1000 - 1000,
      );
      const maxExpiry = new Date(
        afterUpdate.getTime() + AUTH_CONSTANTS.SESSION_EXPIRY_HOURS * 60 * 60 * 1000 + 1000,
      );

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(minExpiry.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(maxExpiry.getTime());
    });

    it("should work with different profile ID field", async () => {
      mockRepository.updateActiveByProfile.mockResolvedValue(undefined);

      await service.updateSessionToken(mockRepository, 50, "customerId", "new-token");

      expect(mockRepository.updateActiveByProfile).toHaveBeenCalledWith(
        "customerId",
        50,
        expect.anything(),
      );
    });
  });
});
