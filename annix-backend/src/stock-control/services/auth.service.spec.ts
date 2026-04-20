import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { PasswordService } from "../../shared/auth/password.service";
import { S3StorageService } from "../../storage/s3-storage.service";
import { User } from "../../user/entities/user.entity";
import { PushSubscription } from "../entities/push-subscription.entity";
import { StaffMember } from "../entities/staff-member.entity";
import { StockControlAdminTransfer } from "../entities/stock-control-admin-transfer.entity";
import { BrandingType, StockControlCompany } from "../entities/stock-control-company.entity";
import {
  StockControlInvitation,
  StockControlInvitationStatus,
} from "../entities/stock-control-invitation.entity";
import { StockControlProfile } from "../entities/stock-control-profile.entity";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { StockControlAuthService } from "./auth.service";
import { CompanyRoleService } from "./company-role.service";
import { PublicBrandingService } from "./public-branding.service";

jest.mock("bcrypt");
jest.mock("uuid", () => ({ v4: () => "mock-uuid-token" }));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe("StockControlAuthService", () => {
  let service: StockControlAuthService;

  const mockQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
    count: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockCompanyRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 10, ...entity })),
  };

  const mockInvitationRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
  };

  const mockStaffRepo = {
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue("mock-jwt-token"),
    verify: jest.fn(),
  };

  const mockEmailService = {
    sendStockControlVerificationEmail: jest.fn().mockResolvedValue(null),
    sendStockControlPasswordResetEmail: jest.fn().mockResolvedValue(null),
    sendStockControlAppLinkEmail: jest.fn().mockResolvedValue(null),
  };

  const mockS3StorageService = {
    presignedUrl: jest.fn().mockResolvedValue("https://s3.example.com/presigned"),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue("s3"),
  };

  const mockPublicBrandingService = {
    clearIconCache: jest.fn(),
  };

  const mockAdminTransferRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data) => ({ ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const mockCompanyRoleService = {
    rolesForCompany: jest.fn(),
  };

  const mockPasswordService = {
    hashSimple: jest.fn().mockResolvedValue("hashed-password"),
    verify: jest.fn().mockResolvedValue(true),
  };

  const mockUnifiedUserRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    save: jest.fn().mockImplementation((entity: any) => Promise.resolve({ id: 1, ...entity })),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockProfileRepo = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const baseUnifiedUser = {
    id: 100,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    passwordHash: "hashed-password",
    emailVerified: true,
    status: "active",
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  const baseProfile = {
    id: 1,
    userId: 100,
    companyId: 20,
    legacyScUserId: 1,
    hideTooltips: false,
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    linkedStaffId: null,
    linkedStaff: null,
    user: null as any,
    company: null as any,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  const baseCompany = {
    id: 20,
    name: "Test Company",
    companyType: "MANUFACTURER",
    brandingType: BrandingType.ANNIX,
    brandingAuthorized: false,
    primaryColor: null,
    accentColor: null,
    logoUrl: null,
    heroImageUrl: null,
    registrationNumber: null,
    vatNumber: null,
    streetAddress: null,
    city: null,
    province: null,
    postalCode: null,
    phone: null,
    email: null,
    websiteUrl: null,
    pipingLossFactorPct: 45,
    flatPlateLossFactorPct: 20,
    structuralSteelLossFactorPct: 30,
    qcEnabled: false,
    messagingEnabled: false,
    staffLeaveEnabled: false,
    workflowEnabled: true,
    legacyScCompanyId: 10,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  const baseUser: StockControlUser = {
    id: 1,
    email: "test@example.com",
    passwordHash: "hashed-password",
    name: "Test User",
    role: StockControlRole.ADMIN,
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpires: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    hideTooltips: false,
    companyId: 10,
    company: {
      id: 10,
      name: "Test Company",
      brandingType: BrandingType.ANNIX,
      websiteUrl: null,
      brandingAuthorized: false,
      primaryColor: null,
      accentColor: null,
      logoUrl: null,
      heroImageUrl: null,
      registrationNumber: null,
      vatNumber: null,
      streetAddress: null,
      city: null,
      province: null,
      postalCode: null,
      phone: null,
      email: null,
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      smtpPassEncrypted: null,
      smtpFromName: null,
      smtpFromEmail: null,
      notificationEmails: [],
      pipingLossFactorPct: 45,
      flatPlateLossFactorPct: 20,
      structuralSteelLossFactorPct: 30,
      qcEnabled: false,
      messagingEnabled: false,
      staffLeaveEnabled: false,
      workflowEnabled: true,
      notificationsEnabled: true,
      sageUsername: null,
      sagePassEncrypted: null,
      sageCompanyId: null,
      sageCompanyName: null,
      sageConnectedAt: null,
      createdAt: now().toJSDate(),
      updatedAt: now().toJSDate(),
    },
    linkedStaff: null,
    linkedStaffId: null,
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    createdAt: now().toJSDate(),
    updatedAt: now().toJSDate(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockControlAuthService,
        { provide: getRepositoryToken(StockControlUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(StockControlCompany), useValue: mockCompanyRepo },
        { provide: getRepositoryToken(StockControlInvitation), useValue: mockInvitationRepo },
        { provide: getRepositoryToken(StockControlAdminTransfer), useValue: mockAdminTransferRepo },
        { provide: getRepositoryToken(StaffMember), useValue: mockStaffRepo },
        {
          provide: getRepositoryToken(PushSubscription),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue(null),
          },
        },
        { provide: getRepositoryToken(User), useValue: mockUnifiedUserRepo },
        { provide: getRepositoryToken(StockControlProfile), useValue: mockProfileRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: S3StorageService, useValue: mockS3StorageService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PublicBrandingService, useValue: mockPublicBrandingService },
        { provide: CompanyRoleService, useValue: mockCompanyRoleService },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
      ],
    }).compile();

    service = module.get<StockControlAuthService>(StockControlAuthService);
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue("s3");
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("throws ConflictException when email already exists", async () => {
      mockUserRepo.findOne.mockResolvedValue(baseUser);

      await expect(service.register("test@example.com", "password", "Test")).rejects.toThrow(
        ConflictException,
      );
    });

    it("creates a new company when no invitation provided", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockInvitationRepo.findOne.mockResolvedValue(null);
      mockCompanyRepo.save.mockResolvedValue({ id: 10 });
      mockUserRepo.save.mockResolvedValue({
        id: 1,
        email: "new@example.com",
        name: "New User",
        role: StockControlRole.ADMIN,
      });
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue("hashed");

      const result = await service.register(
        "new@example.com",
        "password",
        "New User",
        "My Company",
      );

      expect(mockCompanyRepo.create).toHaveBeenCalledWith({ name: "My Company" });
      expect(mockCompanyRepo.save).toHaveBeenCalled();
      expect(result.user.role).toBe(StockControlRole.ADMIN);
      expect(result.isInvitedUser).toBe(false);
      expect(mockEmailService.sendStockControlVerificationEmail).toHaveBeenCalledWith(
        "new@example.com",
        "mock-uuid-token",
      );
    });

    it("uses default company name when none provided", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockInvitationRepo.findOne.mockResolvedValue(null);
      mockCompanyRepo.save.mockResolvedValue({ id: 10 });
      mockUserRepo.save.mockResolvedValue({
        id: 1,
        email: "new@example.com",
        name: "New User",
        role: StockControlRole.ADMIN,
      });
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue("hashed");

      await service.register("new@example.com", "password", "New User");

      expect(mockCompanyRepo.create).toHaveBeenCalledWith({ name: "New User Company" });
    });

    it("accepts invitation token and assigns role from invitation", async () => {
      const futureDate = now().plus({ days: 1 }).toJSDate();
      const invitation = {
        token: "invite-token",
        status: StockControlInvitationStatus.PENDING,
        companyId: 20,
        role: StockControlRole.STOREMAN,
        expiresAt: futureDate,
      };
      mockUserRepo.findOne.mockResolvedValue(null);
      mockInvitationRepo.findOne.mockResolvedValue(invitation);
      mockUserRepo.save.mockResolvedValue({
        id: 2,
        email: "invited@example.com",
        name: "Invited",
        role: StockControlRole.STOREMAN,
      });
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue("hashed");

      const result = await service.register(
        "invited@example.com",
        "password",
        "Invited",
        undefined,
        "invite-token",
      );

      expect(result.isInvitedUser).toBe(true);
      expect(invitation.status).toBe(StockControlInvitationStatus.ACCEPTED);
      expect(mockInvitationRepo.save).toHaveBeenCalled();
    });

    it("throws BadRequestException for invalid invitation token", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockInvitationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.register("test@example.com", "password", "Test", undefined, "bad-token"),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException for expired invitation", async () => {
      const pastDate = now().minus({ days: 1 }).toJSDate();
      const invitation = {
        token: "expired-token",
        status: StockControlInvitationStatus.PENDING,
        companyId: 20,
        role: StockControlRole.STOREMAN,
        expiresAt: pastDate,
      };
      mockUserRepo.findOne.mockResolvedValue(null);
      mockInvitationRepo.findOne.mockResolvedValue(invitation);

      await expect(
        service.register("test@example.com", "password", "Test", undefined, "expired-token"),
      ).rejects.toThrow(BadRequestException);
      expect(invitation.status).toBe(StockControlInvitationStatus.EXPIRED);
    });

    it("joins existing company when pending invitation matches email", async () => {
      const pendingInvitation = {
        email: "invited@example.com",
        status: StockControlInvitationStatus.PENDING,
        companyId: 30,
        role: StockControlRole.MANAGER,
      };
      mockUserRepo.findOne.mockResolvedValue(null);
      mockInvitationRepo.findOne.mockResolvedValue(pendingInvitation);
      mockUserRepo.save.mockResolvedValue({
        id: 3,
        email: "invited@example.com",
        name: "Invited",
        role: StockControlRole.MANAGER,
      });
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue("hashed");

      const result = await service.register("invited@example.com", "password", "Invited");

      expect(result.isInvitedUser).toBe(true);
      expect(pendingInvitation.status).toBe(StockControlInvitationStatus.ACCEPTED);
    });

    it("normalizes email to lowercase and trim", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockInvitationRepo.findOne.mockResolvedValue(null);
      mockCompanyRepo.save.mockResolvedValue({ id: 10 });
      mockUserRepo.save.mockResolvedValue({
        id: 1,
        email: "test@example.com",
        name: "Test",
        role: StockControlRole.ADMIN,
      });
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue("hashed");

      await service.register("  TEST@Example.COM  ", "password", "Test");

      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "test@example.com" }),
      );
    });
  });

  describe("login", () => {
    it("returns tokens and user data on valid credentials", async () => {
      mockUnifiedUserRepo.findOne.mockResolvedValue({ ...baseUnifiedUser });
      mockProfileRepo.findOne.mockResolvedValue({ ...baseProfile });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockJwtService.sign.mockReturnValueOnce("access-token").mockReturnValueOnce("refresh-token");

      const result = await service.login("test@example.com", "password");

      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(result.user.id).toBe(100);
      expect(result.user.email).toBe("test@example.com");
    });

    it("throws UnauthorizedException for unknown email", async () => {
      mockUnifiedUserRepo.findOne.mockResolvedValue(null);

      await expect(service.login("unknown@example.com", "password")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException for wrong password", async () => {
      mockUnifiedUserRepo.findOne.mockResolvedValue({ ...baseUnifiedUser });
      mockPasswordService.verify.mockResolvedValueOnce(false);

      await expect(service.login("test@example.com", "wrong")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("auto-verifies email on first login if not verified", async () => {
      const unverifiedUser = { ...baseUnifiedUser, emailVerified: false };
      mockUnifiedUserRepo.findOne.mockResolvedValue(unverifiedUser);
      mockProfileRepo.findOne.mockResolvedValue({ ...baseProfile });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });

      await service.login("test@example.com", "password");

      expect(mockUnifiedUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ emailVerified: true }),
      );
    });
  });

  describe("refreshToken", () => {
    it("returns new access token for valid refresh token", async () => {
      mockJwtService.verify.mockReturnValue({ sub: 100, tokenType: "refresh" });
      mockUnifiedUserRepo.findOne.mockResolvedValue({ ...baseUnifiedUser });
      mockProfileRepo.findOne.mockResolvedValue({ ...baseProfile });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockJwtService.sign.mockReturnValue("new-access-token");

      const result = await service.refreshToken("valid-refresh-token");

      expect(result.accessToken).toBe("new-access-token");
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 100,
          email: "test@example.com",
          type: "stock-control",
        }),
        { expiresIn: "1h" },
      );
    });

    it("throws UnauthorizedException for invalid token type", async () => {
      mockJwtService.verify.mockReturnValue({ sub: 100, tokenType: "access" });

      await expect(service.refreshToken("access-token-as-refresh")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException when user not found", async () => {
      mockJwtService.verify.mockReturnValue({ sub: 999, tokenType: "refresh" });
      mockUnifiedUserRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshToken("orphan-refresh-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException for expired/malformed token", async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await expect(service.refreshToken("expired-token")).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("verifyEmail", () => {
    it("verifies email and returns tokens for admin user", async () => {
      const user = {
        ...baseUser,
        emailVerified: false,
        emailVerificationToken: "token",
        role: StockControlRole.ADMIN,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUnifiedUserRepo.findOne.mockResolvedValue({ ...baseUnifiedUser });
      mockProfileRepo.findOne.mockResolvedValue({ ...baseProfile });
      mockJwtService.sign.mockReturnValueOnce("access-token").mockReturnValueOnce("refresh-token");

      const result = await service.verifyEmail("token");

      expect(result.message).toBe("Email verified successfully. You can now sign in.");
      expect(result.needsBranding).toBe(true);
      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(user.emailVerified).toBe(true);
      expect(user.emailVerificationToken).toBeNull();
    });

    it("verifies email without tokens for invited (non-admin) user", async () => {
      const user = {
        ...baseUser,
        emailVerified: false,
        emailVerificationToken: "token",
        role: StockControlRole.STOREMAN,
      };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.verifyEmail("token");

      expect(result.needsBranding).toBe(false);
      expect(result.accessToken).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
    });

    it("throws BadRequestException for invalid/expired token", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail("bad-token")).rejects.toThrow(BadRequestException);
    });
  });

  describe("resendVerification", () => {
    it("resends verification email", async () => {
      const user = { ...baseUser, emailVerified: false };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.resendVerification("test@example.com");

      expect(result.message).toContain("Verification email resent");
      expect(mockEmailService.sendStockControlVerificationEmail).toHaveBeenCalled();
    });

    it("throws NotFoundException for unknown email", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.resendVerification("unknown@example.com")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws BadRequestException when email already verified", async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, emailVerified: true });

      await expect(service.resendVerification("test@example.com")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("forgotPassword", () => {
    it("sends reset email for verified user", async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, emailVerified: true });

      const result = await service.forgotPassword("test@example.com");

      expect(result.message).toContain("password reset link");
      expect(mockEmailService.sendStockControlPasswordResetEmail).toHaveBeenCalledWith(
        "test@example.com",
        "mock-uuid-token",
      );
    });

    it("returns same message for non-existent email (no leak)", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword("unknown@example.com");

      expect(result.message).toContain("password reset link");
      expect(mockEmailService.sendStockControlPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("does not send email for unverified user", async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, emailVerified: false });

      await service.forgotPassword("test@example.com");

      expect(mockEmailService.sendStockControlPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("resets password for valid token", async () => {
      const user = { ...baseUser, resetPasswordToken: "reset-token" };
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.resetPassword("reset-token", "new-password");

      expect(result.message).toContain("Password reset successfully");
      expect(user.passwordHash).toBe("hashed-password");
      expect(user.resetPasswordToken).toBeNull();
      expect(user.resetPasswordExpires).toBeNull();
    });

    it("throws BadRequestException for invalid/expired token", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.resetPassword("bad-token", "new-password")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("currentUser", () => {
    it("returns user profile with company details", async () => {
      mockProfileRepo.findOne.mockResolvedValue({
        ...baseProfile,
        user: { ...baseUnifiedUser },
        company: { ...baseCompany },
      });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });

      const result = await service.currentUser(100);

      expect(result.id).toBe(100);
      expect(result.email).toBe("test@example.com");
      expect(result.companyName).toBe("Test Company");
      expect(result.brandingType).toBe(BrandingType.ANNIX);
    });

    it("throws UnauthorizedException when user not found", async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.currentUser(999)).rejects.toThrow(UnauthorizedException);
    });

    it("always returns storeman role from currentUser", async () => {
      mockProfileRepo.findOne.mockResolvedValue({
        ...baseProfile,
        user: { ...baseUnifiedUser },
        company: { ...baseCompany },
      });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });

      const result = await service.currentUser(100);

      expect(result.role).toBe(StockControlRole.STOREMAN);
    });

    it("resolves S3 presigned URLs for logo and hero image", async () => {
      mockProfileRepo.findOne.mockResolvedValue({
        ...baseProfile,
        user: { ...baseUnifiedUser },
        company: {
          ...baseCompany,
          logoUrl: "stock-control/logo.png",
          heroImageUrl: "stock-control/hero.png",
        },
      });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });

      const result = await service.currentUser(100);

      expect(mockS3StorageService.presignedUrl).toHaveBeenCalledTimes(2);
      expect(result.logoUrl).toBe("https://s3.example.com/presigned");
      expect(result.heroImageUrl).toBe("https://s3.example.com/presigned");
    });
  });

  describe("updateMemberRole", () => {
    it("updates role for valid team member", async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, role: StockControlRole.STOREMAN });
      mockCompanyRoleService.rolesForCompany.mockResolvedValue([
        { key: "admin" },
        { key: "manager" },
        { key: "storeman" },
      ]);
      mockUserRepo.count.mockResolvedValue(2);

      const result = await service.updateMemberRole(10, 1, "manager");

      expect(result.message).toBe("Role updated successfully.");
    });

    it("throws NotFoundException for non-existent member", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.updateMemberRole(10, 999, "manager")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException for invalid role", async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });
      mockCompanyRoleService.rolesForCompany.mockResolvedValue([
        { key: "admin" },
        { key: "storeman" },
      ]);

      await expect(service.updateMemberRole(10, 1, "superuser")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("throws ForbiddenException when demoting the only admin", async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, role: StockControlRole.ADMIN });
      mockCompanyRoleService.rolesForCompany.mockResolvedValue([
        { key: "admin" },
        { key: "manager" },
        { key: "storeman" },
      ]);
      mockUserRepo.count.mockResolvedValue(1);

      await expect(service.updateMemberRole(10, 1, "storeman")).rejects.toThrow(ForbiddenException);
    });

    it("allows demoting admin when other admins exist", async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser, role: StockControlRole.ADMIN });
      mockCompanyRoleService.rolesForCompany.mockResolvedValue([
        { key: "admin" },
        { key: "manager" },
        { key: "storeman" },
      ]);
      mockUserRepo.count.mockResolvedValue(2);

      const result = await service.updateMemberRole(10, 1, "storeman");

      expect(result.message).toBe("Role updated successfully.");
    });
  });

  describe("teamMembers", () => {
    it("returns mapped team member list", async () => {
      const users = [
        {
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          role: StockControlRole.ADMIN,
          createdAt: now().toJSDate(),
        },
        {
          id: 2,
          name: "Bob",
          email: "bob@example.com",
          role: StockControlRole.STOREMAN,
          createdAt: now().toJSDate(),
        },
      ];
      mockUserRepo.find.mockResolvedValue(users);

      const result = await service.teamMembers(10);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Alice");
      expect(result[1].role).toBe(StockControlRole.STOREMAN);
    });
  });

  describe("updateLinkedStaff", () => {
    it("links staff member to user", async () => {
      mockStaffRepo.findOne.mockResolvedValue({ id: 5, unifiedCompanyId: 20, active: true });

      const result = await service.updateLinkedStaff(100, 20, 5);

      expect(mockProfileRepo.update).toHaveBeenCalledWith({ userId: 100 }, { linkedStaffId: 5 });
      expect(result.linkedStaffId).toBe(5);
    });

    it("unlinks staff member when null", async () => {
      const result = await service.updateLinkedStaff(100, 20, null);

      expect(mockProfileRepo.update).toHaveBeenCalledWith({ userId: 100 }, { linkedStaffId: null });
      expect(result.linkedStaffId).toBeNull();
    });

    it("throws NotFoundException for inactive/missing staff", async () => {
      mockStaffRepo.findOne.mockResolvedValue(null);
      mockProfileRepo.findOne.mockResolvedValue({ ...baseProfile });
      mockUserRepo.findOne.mockResolvedValue({ ...baseUser });

      await expect(service.updateLinkedStaff(100, 20, 99)).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateTooltipPreference", () => {
    it("updates tooltip preference", async () => {
      const result = await service.updateTooltipPreference(100, true);

      expect(mockProfileRepo.update).toHaveBeenCalledWith({ userId: 100 }, { hideTooltips: true });
      expect(result.hideTooltips).toBe(true);
    });
  });

  describe("setBranding", () => {
    it("sets custom branding on company", async () => {
      mockCompanyRepo.findOne.mockResolvedValue({ ...baseUser.company, id: 10 });

      const result = await service.setBranding(
        10,
        BrandingType.CUSTOM,
        "https://example.com",
        true,
        "#ff0000",
        "#00ff00",
        "logo.png",
        "hero.png",
      );

      expect(result.message).toContain("Branding preference saved");
      expect(mockPublicBrandingService.clearIconCache).toHaveBeenCalledWith(10);
    });

    it("resets branding fields when set to annix", async () => {
      const company = { ...baseUser.company, id: 10 };
      mockCompanyRepo.findOne.mockResolvedValue(company);

      await service.setBranding(10, BrandingType.ANNIX);

      expect(mockCompanyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          brandingType: BrandingType.ANNIX,
          websiteUrl: null,
          primaryColor: null,
          accentColor: null,
          logoUrl: null,
          heroImageUrl: null,
        }),
      );
    });

    it("throws NotFoundException for non-existent company", async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);

      await expect(service.setBranding(999, BrandingType.ANNIX)).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateCompanyDetails", () => {
    it("updates company details", async () => {
      mockCompanyRepo.findOne.mockResolvedValue({ ...baseUser.company, id: 10 });

      const result = await service.updateCompanyDetails(10, {
        name: "Updated Company",
        phone: "012 345 6789",
      });

      expect(result.message).toContain("Company details updated");
    });

    it("throws NotFoundException for non-existent company", async () => {
      mockCompanyRepo.findOne.mockResolvedValue(null);

      await expect(service.updateCompanyDetails(999, { name: "X" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("sendAppLink", () => {
    it("sends app link email to team member", async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...baseUser,
        company: { name: "Test Company" },
      });

      const result = await service.sendAppLink(10, 1);

      expect(result.message).toContain("App link sent");
      expect(mockEmailService.sendStockControlAppLinkEmail).toHaveBeenCalledWith(
        "test@example.com",
        "Test User",
        "Test Company",
      );
    });

    it("throws NotFoundException for non-existent member", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.sendAppLink(10, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
