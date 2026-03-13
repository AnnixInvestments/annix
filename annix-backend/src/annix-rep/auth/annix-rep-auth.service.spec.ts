import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { fromISO } from "../../lib/datetime";
import { PasswordService, TokenService } from "../../shared/auth";
import { SessionInvalidationReason } from "../../shared/enums";
import { User } from "../../user/entities/user.entity";
import { UserRole } from "../../user-roles/entities/user-role.entity";
import { RepProfile } from "../rep-profile/rep-profile.entity";
import { AnnixRepAuthService } from "./annix-rep-auth.service";
import { AnnixRepSession } from "./entities";
import { OAuthLoginProvider } from "./oauth-login.provider";

jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-session-token-uuid"),
}));

describe("AnnixRepAuthService", () => {
  let service: AnnixRepAuthService;
  let sessionRepo: jest.Mocked<Repository<AnnixRepSession>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let userRoleRepo: jest.Mocked<Repository<UserRole>>;
  let repProfileRepo: jest.Mocked<Repository<RepProfile>>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  let oauthProvider: jest.Mocked<OAuthLoginProvider>;

  const mockUser = {
    id: 1,
    username: "rep@company.com",
    email: "rep@company.com",
    password: "hashed-password",
    salt: "random-salt",
    firstName: "John",
    lastName: "Doe",
    roles: [{ id: 10, name: "annixRep" }] as UserRole[],
  } as User;

  const mockAnnixRepRole = { id: 10, name: "annixRep" } as UserRole;

  const mockRepProfile = {
    id: 1,
    userId: 1,
    setupCompleted: true,
  } as RepProfile;

  const mockTokenPair = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  };

  const mockSession = {
    id: 1,
    userId: 1,
    sessionToken: "mock-session-token-uuid",
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
    isActive: true,
    expiresAt: fromISO("2026-01-15T11:00:00Z").toJSDate(),
    lastActivity: fromISO("2026-01-15T10:00:00Z").toJSDate(),
    invalidatedAt: null as unknown as Date,
    invalidationReason: null as unknown as SessionInvalidationReason,
    user: mockUser,
  } as AnnixRepSession;

  beforeEach(async () => {
    const mockSessionRepo: Partial<Repository<AnnixRepSession>> = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockUserRepo: Partial<Repository<User>> = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockUserRoleRepo: Partial<Repository<UserRole>> = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockRepProfileRepo: Partial<Repository<RepProfile>> = {
      findOne: jest.fn(),
    };

    const mockPasswordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    const mockTokenService = {
      generateTokenPair: jest.fn(),
      verifyToken: jest.fn(),
    };

    const mockOAuthProvider = {
      isProviderConfigured: jest.fn(),
      authorizationUrl: jest.fn(),
      exchangeCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnixRepAuthService,
        { provide: getRepositoryToken(AnnixRepSession), useValue: mockSessionRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(UserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(RepProfile), useValue: mockRepProfileRepo },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: OAuthLoginProvider, useValue: mockOAuthProvider },
      ],
    }).compile();

    service = module.get<AnnixRepAuthService>(AnnixRepAuthService);
    sessionRepo = module.get(getRepositoryToken(AnnixRepSession));
    userRepo = module.get(getRepositoryToken(User));
    userRoleRepo = module.get(getRepositoryToken(UserRole));
    repProfileRepo = module.get(getRepositoryToken(RepProfile));
    passwordService = module.get(PasswordService);
    tokenService = module.get(TokenService);
    oauthProvider = module.get(OAuthLoginProvider);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    const registerDto = {
      email: "newrep@company.com",
      password: "mock-test-password",
      firstName: "Jane",
      lastName: "Smith",
    };

    it("should register a new user and return auth response", async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRoleRepo.findOne.mockResolvedValue(mockAnnixRepRole);
      passwordService.hash.mockResolvedValue({ hash: "hashed-pw", salt: "salt-value" });
      userRepo.create.mockReturnValue({ ...mockUser, email: registerDto.email } as User);
      userRepo.save.mockResolvedValue({ ...mockUser, id: 2, email: registerDto.email } as User);
      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);

      const result = await service.register(registerDto, "127.0.0.1", "test-agent");

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      expect(result.expiresIn).toBe(3600);
      expect(result.email).toBe(registerDto.email);
      expect(result.setupCompleted).toBe(false);
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(passwordService.hash).toHaveBeenCalledWith(registerDto.password);
    });

    it("should throw ConflictException when email already exists", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        ConflictException,
      );
    });

    it("should create annixRep role if it does not exist", async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRoleRepo.findOne.mockResolvedValue(null);
      userRoleRepo.create.mockReturnValue(mockAnnixRepRole);
      userRoleRepo.save.mockResolvedValue(mockAnnixRepRole);
      passwordService.hash.mockResolvedValue({ hash: "hashed-pw", salt: "salt-value" });
      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);

      await service.register(registerDto, "127.0.0.1", "test-agent");

      expect(userRoleRepo.create).toHaveBeenCalledWith({ name: "annixRep" });
      expect(userRoleRepo.save).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const loginDto = { email: "rep@company.com", password: "mock-test-password" };

    it("should login and return auth response with profile status", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(true);
      sessionRepo.update.mockResolvedValue({ affected: 1 } as any);
      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      repProfileRepo.findOne.mockResolvedValue(mockRepProfile);

      const result = await service.login(loginDto, "127.0.0.1", "test-agent");

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.userId).toBe(1);
      expect(result.setupCompleted).toBe(true);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
        relations: ["roles"],
      });
    });

    it("should throw UnauthorizedException when user not found", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when password is invalid", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(false);

      await expect(service.login(loginDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when user lacks annixRep role", async () => {
      const userWithoutRole = { ...mockUser, roles: [{ id: 5, name: "employee" }] as UserRole[] };
      userRepo.findOne.mockResolvedValue(userWithoutRole as User);
      passwordService.verify.mockResolvedValue(true);

      await expect(service.login(loginDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should invalidate existing sessions before creating new one", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(true);
      sessionRepo.update.mockResolvedValue({ affected: 2 } as any);
      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      repProfileRepo.findOne.mockResolvedValue(null);

      await service.login(loginDto, "127.0.0.1", "test-agent");

      expect(sessionRepo.update).toHaveBeenCalledWith(
        { userId: 1, isActive: true },
        expect.objectContaining({
          isActive: false,
          invalidationReason: SessionInvalidationReason.NEW_LOGIN,
        }),
      );
    });

    it("should return setupCompleted false when no rep profile exists", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      passwordService.verify.mockResolvedValue(true);
      sessionRepo.update.mockResolvedValue({ affected: 0 } as any);
      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      repProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.login(loginDto, "127.0.0.1", "test-agent");

      expect(result.setupCompleted).toBe(false);
    });
  });

  describe("logout", () => {
    it("should deactivate an active session", async () => {
      const activeSession = { ...mockSession, isActive: true };
      sessionRepo.findOne.mockResolvedValue(activeSession as AnnixRepSession);
      sessionRepo.save.mockResolvedValue(activeSession as AnnixRepSession);

      await service.logout("mock-session-token-uuid");

      expect(sessionRepo.findOne).toHaveBeenCalledWith({
        where: { sessionToken: "mock-session-token-uuid", isActive: true },
      });
      expect(sessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          invalidationReason: SessionInvalidationReason.LOGOUT,
        }),
      );
    });

    it("should do nothing when session not found", async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      await service.logout("nonexistent-token");

      expect(sessionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("refreshSession", () => {
    const refreshDto = { refreshToken: "valid-refresh-token" };

    it("should refresh session and return new tokens", async () => {
      const payload = {
        sub: 1,
        email: "rep@company.com",
        type: "annixRep" as const,
        sessionToken: "old-session-token",
        annixRepUserId: 1,
      };
      tokenService.verifyToken.mockResolvedValue(payload);
      userRepo.findOne.mockResolvedValue(mockUser);
      sessionRepo.update.mockResolvedValue({ affected: 1 } as any);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      repProfileRepo.findOne.mockResolvedValue(mockRepProfile);

      const result = await service.refreshSession(refreshDto, "127.0.0.1", "test-agent");

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      expect(result.setupCompleted).toBe(true);
    });

    it("should throw UnauthorizedException for invalid refresh token", async () => {
      tokenService.verifyToken.mockRejectedValue(new Error("Invalid token"));

      await expect(service.refreshSession(refreshDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when token type is not annixRep", async () => {
      tokenService.verifyToken.mockResolvedValue({
        sub: 1,
        email: "rep@company.com",
        type: "admin",
        sessionToken: "token",
        annixRepUserId: 1,
      });

      await expect(service.refreshSession(refreshDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when user not found", async () => {
      tokenService.verifyToken.mockResolvedValue({
        sub: 999,
        email: "gone@company.com",
        type: "annixRep",
        sessionToken: "token",
        annixRepUserId: 999,
      });
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshSession(refreshDto, "127.0.0.1", "test-agent")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("profile", () => {
    it("should return profile response for existing user", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      repProfileRepo.findOne.mockResolvedValue(mockRepProfile);

      const result = await service.profile(1);

      expect(result).toEqual({
        userId: 1,
        email: "rep@company.com",
        firstName: "John",
        lastName: "Doe",
        setupCompleted: true,
      });
    });

    it("should throw UnauthorizedException when user not found", async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.profile(999)).rejects.toThrow(UnauthorizedException);
    });

    it("should return setupCompleted false when no rep profile", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      repProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.profile(1);

      expect(result.setupCompleted).toBe(false);
    });
  });

  describe("checkEmailAvailable", () => {
    it("should return true when email is not taken", async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.checkEmailAvailable("new@company.com");

      expect(result).toBe(true);
    });

    it("should return false when email already exists", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.checkEmailAvailable("rep@company.com");

      expect(result).toBe(false);
    });
  });

  describe("verifySession", () => {
    it("should return session when active and not expired", async () => {
      const futureSession = {
        ...mockSession,
        expiresAt: fromISO("2099-01-15T10:00:00Z").toJSDate(),
      };
      sessionRepo.findOne.mockResolvedValue(futureSession as AnnixRepSession);
      sessionRepo.save.mockResolvedValue(futureSession as AnnixRepSession);

      const result = await service.verifySession("mock-session-token-uuid");

      expect(result).toBeTruthy();
      expect(sessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ sessionToken: "mock-session-token-uuid" }),
      );
    });

    it("should return null when session not found", async () => {
      sessionRepo.findOne.mockResolvedValue(null);

      const result = await service.verifySession("nonexistent-token");

      expect(result).toBeNull();
    });

    it("should invalidate and return null when session is expired", async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: fromISO("2020-01-01T00:00:00Z").toJSDate(),
      };
      sessionRepo.findOne.mockResolvedValue(expiredSession as AnnixRepSession);
      sessionRepo.save.mockResolvedValue(expiredSession as AnnixRepSession);

      const result = await service.verifySession("mock-session-token-uuid");

      expect(result).toBeNull();
      expect(sessionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
          invalidationReason: SessionInvalidationReason.EXPIRED,
        }),
      );
    });
  });

  describe("isOAuthProviderConfigured", () => {
    it("should delegate to OAuthLoginProvider", () => {
      oauthProvider.isProviderConfigured.mockReturnValue(true);

      const result = service.isOAuthProviderConfigured("google");

      expect(result).toBe(true);
      expect(oauthProvider.isProviderConfigured).toHaveBeenCalledWith("google");
    });
  });

  describe("oauthAuthorizationUrl", () => {
    it("should delegate to OAuthLoginProvider", () => {
      oauthProvider.authorizationUrl.mockReturnValue("https://accounts.google.com/auth");

      const result = service.oauthAuthorizationUrl("google", "http://callback", "state-value");

      expect(result).toBe("https://accounts.google.com/auth");
      expect(oauthProvider.authorizationUrl).toHaveBeenCalledWith(
        "google",
        "http://callback",
        "state-value",
      );
    });

    it("should return null when provider returns null", () => {
      oauthProvider.authorizationUrl.mockReturnValue(null);

      const result = service.oauthAuthorizationUrl("google", "http://callback", "state");

      expect(result).toBeNull();
    });
  });

  describe("oauthLogin", () => {
    it("should create new user when no existing account for OAuth email", async () => {
      oauthProvider.exchangeCode.mockResolvedValue({
        accessToken: "oauth-access",
        refreshToken: null,
        email: "oauth@company.com",
        oauthId: "google-123",
        firstName: "OAuth",
        lastName: "User",
      });
      userRepo.findOne.mockResolvedValue(null);
      userRoleRepo.findOne.mockResolvedValue(mockAnnixRepRole);
      userRepo.create.mockReturnValue({
        ...mockUser,
        id: 5,
        email: "oauth@company.com",
      } as User);
      userRepo.save.mockResolvedValue({
        ...mockUser,
        id: 5,
        email: "oauth@company.com",
      } as User);
      sessionRepo.update.mockResolvedValue({ affected: 0 } as any);
      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      repProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.oauthLogin(
        "google",
        "auth-code",
        "http://callback",
        "127.0.0.1",
        "test-agent",
      );

      expect(result.accessToken).toBe("mock-access-token");
      expect(result.email).toBe("oauth@company.com");
      expect(result.setupCompleted).toBe(false);
    });

    it("should throw UnauthorizedException when OAuth exchange fails", async () => {
      oauthProvider.exchangeCode.mockResolvedValue(null);

      await expect(
        service.oauthLogin("google", "bad-code", "http://callback", "127.0.0.1", "test-agent"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should add annixRep role to existing user without it", async () => {
      oauthProvider.exchangeCode.mockResolvedValue({
        accessToken: "oauth-access",
        refreshToken: null,
        email: "existing@company.com",
        oauthId: "google-456",
        firstName: "Existing",
        lastName: "User",
      });
      const existingUserNoRole = {
        ...mockUser,
        roles: [{ id: 5, name: "employee" }] as UserRole[],
        oauthProvider: "google",
        oauthId: "google-456",
      };
      userRepo.findOne.mockResolvedValue(existingUserNoRole as User);
      userRoleRepo.findOne.mockResolvedValue(mockAnnixRepRole);
      userRepo.save.mockResolvedValue(existingUserNoRole as User);
      sessionRepo.update.mockResolvedValue({ affected: 0 } as any);
      sessionRepo.create.mockReturnValue(mockSession);
      sessionRepo.save.mockResolvedValue(mockSession);
      tokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      repProfileRepo.findOne.mockResolvedValue(null);

      await service.oauthLogin("google", "auth-code", "http://callback", "127.0.0.1", "test-agent");

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: expect.arrayContaining([
            expect.objectContaining({ name: "employee" }),
            expect.objectContaining({ name: "annixRep" }),
          ]),
        }),
      );
    });
  });
});
