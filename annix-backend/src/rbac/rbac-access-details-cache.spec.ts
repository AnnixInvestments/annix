import { RbacService } from "./rbac.service";
import { RbacAccessDetailsCache } from "./rbac-access-details-cache";

/**
 * #403 performance-1: userAccessDetails resolves the access record ONCE per
 * request, caches the resolved {roleCode, isAdmin, permissions, hasAccess} for a
 * short TTL keyed by (userId, appCode), and re-resolves after a mutation
 * invalidates the entry or after the TTL lapses.
 */

const APP = { id: 7, code: "au-rubber" };

const makeAccess = (overrides: Record<string, unknown> = {}) => ({
  id: 100,
  userId: 42,
  appId: APP.id,
  useCustomPermissions: false,
  expiresAt: null,
  role: {
    code: "viewer",
    name: "Viewer",
    rolePermissions: [{ permission: { code: "coc:read" } }],
  },
  customPermissions: [],
  ...overrides,
});

function makeService() {
  const appRepo = {
    findByCode: jest.fn(async (code: string) => (code === APP.code ? APP : null)),
    findAllActive: jest.fn(async () => [APP]),
  };
  const accessRepo = {
    findWithPermissionsAndRole: jest.fn(async () => makeAccess()),
    findById: jest.fn(async () => makeAccess()),
    remove: jest.fn(async () => undefined),
  };
  const rolePermissionRepo = {
    deleteByRoleId: jest.fn(async () => undefined),
    create: jest.fn(async () => undefined),
  };
  const permissionRepo = {
    findManyWhere: jest.fn(async () => [
      { id: 1, code: "coc:read" },
      { id: 2, code: "coc:write" },
    ]),
  };
  const roleRepo = { findById: jest.fn(async () => ({ id: 5, appId: APP.id, name: "Viewer" })) };

  const service = new RbacService(
    new RbacAccessDetailsCache() as never,
    appRepo as never,
    permissionRepo as never,
    roleRepo as never,
    rolePermissionRepo as never,
    {} as never,
    accessRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { service, appRepo, accessRepo, rolePermissionRepo, roleRepo };
}

describe("RbacService.userAccessDetails caching (#403 performance-1)", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("resolves the access record exactly once per call (no doubled lookup)", async () => {
    const { service, accessRepo } = makeService();

    await service.userAccessDetails(42, APP.code);

    expect(accessRepo.findWithPermissionsAndRole).toHaveBeenCalledTimes(1);
  });

  it("returns the cached result within the TTL without re-resolving", async () => {
    const { service, accessRepo } = makeService();

    const first = await service.userAccessDetails(42, APP.code);
    const second = await service.userAccessDetails(42, APP.code);

    expect(second).toEqual(first);
    expect(accessRepo.findWithPermissionsAndRole).toHaveBeenCalledTimes(1);
  });

  it("re-resolves once the TTL has elapsed", async () => {
    jest.useFakeTimers();
    const { service, accessRepo } = makeService();

    await service.userAccessDetails(42, APP.code);
    jest.advanceTimersByTime(60_000);
    await service.userAccessDetails(42, APP.code);

    expect(accessRepo.findWithPermissionsAndRole).toHaveBeenCalledTimes(2);
  });

  it("re-resolves after revokeAccess invalidates the (userId, appCode) entry", async () => {
    const { service, accessRepo } = makeService();

    await service.userAccessDetails(42, APP.code);
    expect(accessRepo.findWithPermissionsAndRole).toHaveBeenCalledTimes(1);

    await service.revokeAccess(100);

    await service.userAccessDetails(42, APP.code);
    expect(accessRepo.findWithPermissionsAndRole).toHaveBeenCalledTimes(2);
  });

  it("re-resolves after a role-permission change invalidates the app", async () => {
    const { service, accessRepo } = makeService();

    await service.userAccessDetails(42, APP.code);
    expect(accessRepo.findWithPermissionsAndRole).toHaveBeenCalledTimes(1);

    await service.setRolePermissions(5, []);

    await service.userAccessDetails(42, APP.code);
    expect(accessRepo.findWithPermissionsAndRole).toHaveBeenCalledTimes(2);
  });

  it("propagates a permission change after invalidation", async () => {
    const { service, accessRepo } = makeService();

    const before = await service.userAccessDetails(42, APP.code);
    expect(before.permissions).toEqual(["coc:read"]);

    accessRepo.findWithPermissionsAndRole.mockResolvedValue(
      makeAccess({
        role: {
          code: "viewer",
          name: "Viewer",
          rolePermissions: [
            { permission: { code: "coc:read" } },
            { permission: { code: "coc:write" } },
          ],
        },
      }) as never,
    );

    await service.setRolePermissions(5, ["coc:read", "coc:write"]);

    const after = await service.userAccessDetails(42, APP.code);
    expect(after.permissions).toEqual(["coc:read", "coc:write"]);
  });
});
