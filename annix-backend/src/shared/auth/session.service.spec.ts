import { Test, TestingModule } from "@nestjs/testing";
import { Repository } from "typeorm";
import { AUTH_CONSTANTS } from "./auth.constants";
import { SessionService } from "./session.service";

interface MockSession {
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
  let mockRepository: jest.Mocked<Repository<MockSession>>;

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
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<MockSession>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createSession", () => {
    it("should create session with tokens", () => {
      const createdSession = { id: 1 } as MockSession;
      mockRepository.create.mockReturnValue(createdSession);

      const result = service.createSession(mockRepository, mockSessionData);

      expect(result.session).toBe(createdSession);
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
      mockRepository.create.mockReturnValue({} as MockSession);

      const result1 = service.createSession(mockRepository, mockSessionData);
      const result2 = service.createSession(mockRepository, mockSessionData);

      expect(result1.sessionToken).not.toBe(result2.sessionToken);
      expect(result1.refreshToken).not.toBe(result2.refreshToken);
    });

    it("should create session with correct profile ID field", () => {
      mockRepository.create.mockImplementation((data) => data as MockSession);

      const result = service.createSession(mockRepository, mockSessionData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: 100,
        }),
      );
      expect(result.session).toHaveProperty("profileId", 100);
    });

    it("should create session with device info", () => {
      mockRepository.create.mockImplementation((data) => data as MockSession);

      const result = service.createSession(mockRepository, mockSessionData);

      expect(result.session).toHaveProperty("deviceFingerprint", "fp-abc123");
      expect(result.session).toHaveProperty("ipAddress", "192.168.1.1");
      expect(result.session).toHaveProperty("userAgent", "Mozilla/5.0 Test Browser");
    });

    it("should create session with isActive true", () => {
      mockRepository.create.mockImplementation((data) => data as MockSession);

      const result = service.createSession(mockRepository, mockSessionData);

      expect(result.session).toHaveProperty("isActive", true);
    });

    it("should set expiry time based on AUTH_CONSTANTS", () => {
      mockRepository.create.mockImplementation((data) => data as MockSession);

      const beforeCreate = new Date();
      const result = service.createSession(mockRepository, mockSessionData);
      const afterCreate = new Date();

      const expiresAt = (result.session as any).expiresAt;
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
      mockRepository.create.mockImplementation((data) => data as MockSession);

      const beforeCreate = new Date();
      const result = service.createSession(mockRepository, mockSessionData);
      const afterCreate = new Date();

      const lastActivity = (result.session as any).lastActivity;
      expect(lastActivity.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 1000);
      expect(lastActivity.getTime()).toBeLessThanOrEqual(afterCreate.getTime() + 1000);
    });

    it("should work with different profile ID field names", () => {
      mockRepository.create.mockImplementation((data) => data as MockSession);

      const data = {
        profileId: 50,
        profileIdField: "customerId" as const,
        deviceFingerprint: "fp",
        ipAddress: "127.0.0.1",
        userAgent: "Test",
      };

      service.createSession(mockRepository, data);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 50,
        }),
      );
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
      mockRepository.findOne.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(mockSession);

      const result = await service.validateSession(mockRepository, "test-token");

      expect(result).toBe(mockSession);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { sessionToken: "test-token", isActive: true },
        relations: undefined,
      });
    });

    it("should return null when session not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.validateSession(mockRepository, "invalid-token");

      expect(result).toBeNull();
    });

    it("should return null and invalidate expired session", async () => {
      const expiredSession = createMockSession({
        expiresAt: new Date(Date.now() - 1000),
      });
      mockRepository.findOne.mockResolvedValue(expiredSession);
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
      mockRepository.findOne.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(mockSession);

      await service.validateSession(mockRepository, "test-token");

      expect(mockSession.lastActivity.getTime()).toBeGreaterThan(originalLastActivity.getTime());
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should pass relations to findOne when provided", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await service.validateSession(mockRepository, "token", ["profile", "profile.user"]);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { sessionToken: "token", isActive: true },
        relations: ["profile", "profile.user"],
      });
    });
  });

  describe("invalidateAllSessions", () => {
    it("should update all active sessions for profile", async () => {
      mockRepository.update.mockResolvedValue({ affected: 3 } as any);

      await service.invalidateAllSessions(mockRepository, 100, "profileId", "LOGOUT_ALL");

      expect(mockRepository.update).toHaveBeenCalledWith(
        { profileId: 100, isActive: true },
        expect.objectContaining({
          isActive: false,
          invalidationReason: "LOGOUT_ALL",
          invalidatedAt: expect.any(Date),
        }),
      );
    });

    it("should work with different profile ID field", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.invalidateAllSessions(mockRepository, 50, "customerId", "PASSWORD_CHANGE");

      expect(mockRepository.update).toHaveBeenCalledWith(
        { customerId: 50, isActive: true },
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
      mockRepository.findOne.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue(mockSession);

      const result = await service.invalidateSession(mockRepository, "test-token", "USER_LOGOUT");

      expect(result).toBe(mockSession);
      expect(mockSession.isActive).toBe(false);
      expect(mockSession.invalidationReason).toBe("USER_LOGOUT");
      expect(mockSession.invalidatedAt).toBeInstanceOf(Date);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it("should return null when session not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.invalidateSession(
        mockRepository,
        "invalid-token",
        "USER_LOGOUT",
      );

      expect(result).toBeNull();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it("should search for active sessions only", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await service.invalidateSession(mockRepository, "test-token", "LOGOUT");

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { sessionToken: "test-token", isActive: true },
      });
    });
  });

  describe("updateSessionToken", () => {
    it("should update session token and extend expiry", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      const beforeUpdate = new Date();
      await service.updateSessionToken(mockRepository, 100, "profileId", "new-token");
      const afterUpdate = new Date();

      expect(mockRepository.update).toHaveBeenCalledWith(
        { profileId: 100, isActive: true },
        expect.objectContaining({
          sessionToken: "new-token",
          lastActivity: expect.any(Date),
          expiresAt: expect.any(Date),
        }),
      );

      const updateCall = mockRepository.update.mock.calls[0][1] as any;
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
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateSessionToken(mockRepository, 50, "customerId", "new-token");

      expect(mockRepository.update).toHaveBeenCalledWith(
        { customerId: 50, isActive: true },
        expect.anything(),
      );
    });
  });
});
