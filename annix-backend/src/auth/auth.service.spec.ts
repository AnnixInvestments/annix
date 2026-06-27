import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../audit/audit.service";
import { AppRepository, UserAppAccessRepository } from "../rbac/rbac.repository";
import { PasswordService } from "../shared/auth/password.service";
import { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";
import { AuthService } from "./auth.service";
import { LoginAttemptService } from "./login-attempt.service";

describe("AuthService", () => {
  let service: AuthService;
  let userRepo: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUserRepo = {
    findByEmailWithRoles: jest.fn(),
    findByIdWithRoles: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPasswordService = {
    verify: jest.fn(),
    hash: jest.fn(),
    hashSimple: jest.fn(),
  };

  const mockAccessRepo = {
    findManyWhere: jest.fn(),
  };

  const mockAppRepo = {
    findById: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const mockLoginAttemptService = {
    assertNotLocked: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
    recordSuccess: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PasswordService, useValue: mockPasswordService },
        { provide: UserAppAccessRepository, useValue: mockAccessRepo },
        { provide: AppRepository, useValue: mockAppRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: LoginAttemptService, useValue: mockLoginAttemptService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(UserRepository);
    jwtService = module.get(JwtService);

    jest.resetAllMocks();
    mockAuditService.log.mockResolvedValue(undefined);
    mockLoginAttemptService.assertNotLocked.mockResolvedValue(undefined);
    mockLoginAttemptService.recordFailure.mockResolvedValue(undefined);
    mockLoginAttemptService.recordSuccess.mockResolvedValue(undefined);
  });

  describe("validateUser", () => {
    it("should return user data without password and salt if credentials are valid", async () => {
      const user = {
        id: 1,
        username: "john",
        email: "john@example.com",
        passwordHash: "hashed_pass",
        roles: [{ id: 1, name: "employee" }],
      } as User;

      mockUserRepo.findByEmailWithRoles.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(true);

      const result = await service.validateUser("john@example.com", "123456");

      expect(result).toEqual({
        id: 1,
        username: "john",
        email: "john@example.com",
        roles: [{ id: 1, name: "employee" }],
      });
    });

    it("should throw UnauthorizedException if user is not found", async () => {
      mockUserRepo.findByEmailWithRoles.mockResolvedValue(null);
      await expect(service.validateUser("nonexistent@example.com", "123456")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if password is invalid", async () => {
      const user = {
        id: 1,
        username: "john",
        email: "john@example.com",
        passwordHash: "hashed_pass",
        roles: [{ id: 1, name: "employee" }],
      } as User;

      mockUserRepo.findByEmailWithRoles.mockResolvedValue(user);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(service.validateUser("john@example.com", "123456")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("login", () => {
    it("should return access token", async () => {
      const user = {
        id: 1,
        username: "john",
        roles: [{ id: 1, name: "employee" }],
      };

      mockJwtService.signAsync.mockResolvedValue("signed_jwt_token");

      const result = await service.login(user);

      expect(result).toEqual({
        access_token: "signed_jwt_token",
        refresh_token: "signed_jwt_token",
        token_type: "Bearer",
        expires_in: 3600,
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(expect.any(Object), {
        expiresIn: "8h",
      });
    });
  });
});
