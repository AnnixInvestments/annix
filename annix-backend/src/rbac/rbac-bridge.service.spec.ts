import type { AppRepository, AppRoleRepository, UserAppAccessRepository } from "./rbac.repository";
import { RbacBridgeService } from "./rbac-bridge.service";

describe("RbacBridgeService (issue #311 step 4.1)", () => {
  const makeService = () => {
    const appRepo = { findByCode: jest.fn() } as unknown as jest.Mocked<AppRepository>;
    const roleRepo = {
      findByAppIdAndCode: jest.fn(),
    } as unknown as jest.Mocked<AppRoleRepository>;
    const accessRepo = {
      findOneByUserAndApp: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserAppAccessRepository>;
    const accessDetailsCache = { invalidate: jest.fn() };
    const service = new RbacBridgeService(
      appRepo,
      roleRepo,
      accessRepo,
      accessDetailsCache as never,
    );
    return { service, appRepo, roleRepo, accessRepo, accessDetailsCache };
  };

  it("creates a grant with the resolved role when none exists", async () => {
    const { service, appRepo, roleRepo, accessRepo } = makeService();
    appRepo.findByCode.mockResolvedValue({ id: 7, code: "annix-rep" } as never);
    accessRepo.findOneByUserAndApp.mockResolvedValue(null);
    roleRepo.findByAppIdAndCode.mockResolvedValue({ id: 3, code: "viewer" } as never);
    accessRepo.create.mockResolvedValue({ id: 1 } as never);

    await service.ensureAppAccess(42, "annix-rep", "viewer");

    expect(accessRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, appId: 7, roleId: 3, useCustomPermissions: false }),
    );
  });

  it("invalidates the (userId, appCode) access-details cache after creating a grant", async () => {
    const { service, appRepo, roleRepo, accessRepo, accessDetailsCache } = makeService();
    appRepo.findByCode.mockResolvedValue({ id: 7, code: "au-rubber" } as never);
    accessRepo.findOneByUserAndApp.mockResolvedValue(null);
    roleRepo.findByAppIdAndCode.mockResolvedValue({ id: 3, code: "viewer" } as never);
    accessRepo.create.mockResolvedValue({ id: 1 } as never);

    await service.ensureAppAccess(42, "au-rubber", "viewer");

    expect(accessDetailsCache.invalidate).toHaveBeenCalledWith(42, "au-rubber");
  });

  it("does not invalidate the cache when the grant already exists", async () => {
    const { service, appRepo, accessRepo, accessDetailsCache } = makeService();
    appRepo.findByCode.mockResolvedValue({ id: 7, code: "au-rubber" } as never);
    accessRepo.findOneByUserAndApp.mockResolvedValue({ id: 99 } as never);

    await service.ensureAppAccess(42, "au-rubber", "viewer");

    expect(accessDetailsCache.invalidate).not.toHaveBeenCalled();
  });

  it("is idempotent — never creates a second grant for the same user+app", async () => {
    const { service, appRepo, accessRepo } = makeService();
    appRepo.findByCode.mockResolvedValue({ id: 7, code: "annix-rep" } as never);
    accessRepo.findOneByUserAndApp.mockResolvedValue({ id: 99 } as never);

    await service.ensureAppAccess(42, "annix-rep", "viewer");

    expect(accessRepo.create).not.toHaveBeenCalled();
  });

  it("writes a null roleId when the role code is unknown (still anchors the identity)", async () => {
    const { service, appRepo, roleRepo, accessRepo } = makeService();
    appRepo.findByCode.mockResolvedValue({ id: 7, code: "teacher-assistant" } as never);
    accessRepo.findOneByUserAndApp.mockResolvedValue(null);
    roleRepo.findByAppIdAndCode.mockResolvedValue(null);
    accessRepo.create.mockResolvedValue({ id: 1 } as never);

    await service.ensureAppAccess(42, "teacher-assistant", "viewer");

    expect(accessRepo.create).toHaveBeenCalledWith(expect.objectContaining({ roleId: null }));
  });

  it("does nothing when the app is not in the catalogue", async () => {
    const { service, appRepo, accessRepo } = makeService();
    appRepo.findByCode.mockResolvedValue(null);

    await service.ensureAppAccess(42, "missing-app", "viewer");

    expect(accessRepo.create).not.toHaveBeenCalled();
  });

  it("never throws into the caller when a repository fails", async () => {
    const { service, appRepo } = makeService();
    appRepo.findByCode.mockRejectedValue(new Error("db down"));

    await expect(service.ensureAppAccess(42, "annix-rep", "viewer")).resolves.toBeUndefined();
  });
});
