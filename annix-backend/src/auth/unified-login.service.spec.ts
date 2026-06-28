import { UnauthorizedException } from "@nestjs/common";
import type { ModuleRef } from "@nestjs/core";
import { CompanyService } from "../platform/company.service";
import { AppScope } from "../rbac/app-scope";
import type { AuthConfigService } from "../shared/auth/auth-config.service";
import type { PasswordService } from "../shared/auth/password.service";
import type { User } from "../user/entities/user.entity";
import type { UserRepository } from "../user/user.repository";
import { UnifiedLoginService } from "./unified-login.service";

describe("UnifiedLoginService", () => {
  let service: UnifiedLoginService;
  let userRepo: {
    findOneByEmailAndScope: jest.Mock;
    findByEmailWithRolesAndScope: jest.Mock;
  };
  let passwordService: {
    hashSimple: jest.Mock;
    verify: jest.Mock;
  };
  let authConfigService: {
    isPasswordVerificationDisabled: jest.Mock;
    isCoreLoginModuleGateEnabled: jest.Mock;
  };
  let companyService: {
    enabledApps: jest.Mock;
    coreAppAccessState: jest.Mock;
  };
  let moduleRef: { get: jest.Mock };

  const user = (overrides: Partial<User> = {}): User =>
    ({
      id: 1,
      email: "user@example.com",
      passwordHash: "hash",
      companyId: 7,
      roles: [],
      ...overrides,
    }) as User;

  beforeEach(() => {
    userRepo = {
      findOneByEmailAndScope: jest.fn(),
      findByEmailWithRolesAndScope: jest.fn(),
    };
    passwordService = {
      hashSimple: jest.fn().mockResolvedValue("dummy-hash"),
      verify: jest.fn().mockResolvedValue(true),
    };
    authConfigService = {
      isPasswordVerificationDisabled: jest.fn().mockReturnValue(false),
      isCoreLoginModuleGateEnabled: jest.fn().mockReturnValue(false),
    };
    companyService = {
      enabledApps: jest.fn().mockResolvedValue(["stock-control"]),
      coreAppAccessState: jest.fn().mockResolvedValue("unknown"),
    };
    moduleRef = {
      get: jest.fn().mockReturnValue(companyService),
    };

    service = new UnifiedLoginService(
      userRepo as unknown as UserRepository,
      passwordService as unknown as PasswordService,
      authConfigService as unknown as AuthConfigService,
      moduleRef as unknown as ModuleRef,
    );
  });

  it("keeps resolve-app behavior unchanged when the Core login gate is off", async () => {
    userRepo.findOneByEmailAndScope.mockResolvedValue(user());
    companyService.coreAppAccessState.mockResolvedValue("disabled");

    await expect(service.resolveApp(" USER@example.com ", "password")).resolves.toEqual({
      app: "stock-control",
      enabledApps: ["stock-control"],
      companyId: 7,
    });

    expect(userRepo.findOneByEmailAndScope).toHaveBeenCalledWith(
      "user@example.com",
      AppScope.STOCK_CONTROL,
    );
    expect(companyService.coreAppAccessState).not.toHaveBeenCalled();
  });

  it("denies login when the Core login gate is on and the resolved app is explicitly disabled", async () => {
    userRepo.findOneByEmailAndScope.mockResolvedValue(user());
    authConfigService.isCoreLoginModuleGateEnabled.mockReturnValue(true);
    companyService.coreAppAccessState.mockResolvedValue("disabled");

    await expect(service.resolveApp("user@example.com", "password")).rejects.toThrow(
      UnauthorizedException,
    );

    expect(companyService.coreAppAccessState).toHaveBeenCalledWith(7, "stock-control");
    expect(companyService.enabledApps).not.toHaveBeenCalled();
  });

  it("fails open when the Core login gate is on but the user has no company id", async () => {
    userRepo.findOneByEmailAndScope.mockResolvedValue(user({ companyId: null }));
    authConfigService.isCoreLoginModuleGateEnabled.mockReturnValue(true);

    await expect(service.resolveApp("user@example.com", "password")).resolves.toEqual({
      app: "stock-control",
      enabledApps: ["stock-control"],
      companyId: null,
    });

    expect(moduleRef.get).not.toHaveBeenCalledWith(CompanyService, { strict: false });
  });

  it("fails open for a plain admin with no AU Rubber explicit gate row", async () => {
    userRepo.findOneByEmailAndScope.mockResolvedValue(null);
    userRepo.findByEmailWithRolesAndScope.mockResolvedValue(
      user({ appScope: AppScope.ANNIX_ADMIN }),
    );
    authConfigService.isCoreLoginModuleGateEnabled.mockReturnValue(true);
    companyService.coreAppAccessState.mockResolvedValue("unknown");
    companyService.enabledApps.mockResolvedValue(["stock-control"]);

    await expect(service.resolveApp("admin@example.com", "password")).resolves.toEqual({
      app: "au-rubber",
      enabledApps: ["stock-control"],
      companyId: 7,
    });

    expect(companyService.coreAppAccessState).toHaveBeenCalledWith(7, "au-rubber");
  });

  it("fails open when the Core gate state cannot be loaded", async () => {
    userRepo.findOneByEmailAndScope.mockResolvedValue(user());
    authConfigService.isCoreLoginModuleGateEnabled.mockReturnValue(true);
    moduleRef.get.mockImplementationOnce(() => {
      throw new Error("platform unavailable");
    });

    await expect(service.resolveApp("user@example.com", "password")).resolves.toEqual({
      app: "stock-control",
      enabledApps: ["stock-control"],
      companyId: 7,
    });
  });
});
