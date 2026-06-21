import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ActionPermissionService } from "../services/action-permission.service";
import {
  PERMISSION_KEY,
  roleSatisfiesRequirement,
  STOCK_CONTROL_ROLES_KEY,
  StockControlRoleGuard,
} from "./stock-control-role.guard";

describe("roleSatisfiesRequirement", () => {
  it("grants when the user role is explicitly listed", () => {
    expect(roleSatisfiesRequirement("manager", ["manager", "admin"])).toBe(true);
  });

  it("grants a higher rank against a lower-ranked-only requirement", () => {
    expect(roleSatisfiesRequirement("admin", ["manager"])).toBe(true);
    expect(roleSatisfiesRequirement("manager", ["storeman"])).toBe(true);
  });

  it("denies a lower rank against a higher requirement", () => {
    expect(roleSatisfiesRequirement("storeman", ["manager", "admin"])).toBe(false);
    expect(roleSatisfiesRequirement("viewer", ["manager"])).toBe(false);
  });

  it("does not grant an intermediate role that sits below the highest required role", () => {
    expect(roleSatisfiesRequirement("storeman", ["quality", "manager", "admin"])).toBe(false);
  });

  it("does not apply hierarchy when a required role is unknown", () => {
    expect(roleSatisfiesRequirement("admin", ["receiving-clerk"])).toBe(false);
  });

  it("does not apply hierarchy when the user role is unknown", () => {
    expect(roleSatisfiesRequirement("receiving-clerk", ["manager"])).toBe(false);
  });
});

describe("StockControlRoleGuard - static role hierarchy", () => {
  const buildContext = (user: { role: string; companyId?: number } | null) => {
    const request = { user };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
      getClass: () => class {},
    } as never;
  };

  const buildGuard = (
    requiredRoles: string[] | undefined,
    permissionKey: string | null,
    actionService: ActionPermissionService | null,
  ) => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === STOCK_CONTROL_ROLES_KEY
          ? requiredRoles
          : key === PERMISSION_KEY
            ? permissionKey
            : undefined,
      ),
    } as unknown as Reflector;
    return new StockControlRoleGuard(reflector, actionService);
  };

  it("allows admin where only manager is required (static hierarchy)", async () => {
    const guard = buildGuard(["manager"], null, null);
    await expect(guard.canActivate(buildContext({ role: "admin" }))).resolves.toBe(true);
  });

  it("allows manager where only storeman is required", async () => {
    const guard = buildGuard(["storeman"], null, null);
    await expect(guard.canActivate(buildContext({ role: "manager" }))).resolves.toBe(true);
  });

  it("denies a lower role than required", async () => {
    const guard = buildGuard(["manager", "admin"], null, null);
    await expect(guard.canActivate(buildContext({ role: "storeman" }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("passes through when no roles are required", async () => {
    const guard = buildGuard(undefined, null, null);
    await expect(guard.canActivate(buildContext({ role: "viewer" }))).resolves.toBe(true);
  });

  it("preserves exact-match semantics on the per-company override path", async () => {
    const actionService = {
      rolesForAction: jest.fn().mockResolvedValue(["manager", "admin"]),
    } as unknown as ActionPermissionService;
    const guard = buildGuard(["manager", "admin"], "job-cards.create", actionService);

    await expect(
      guard.canActivate(buildContext({ role: "storeman", companyId: 1 })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
