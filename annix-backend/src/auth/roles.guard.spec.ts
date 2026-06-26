import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";

// Test controllers mirroring the real shapes: a class-level @Roles (the #384
// case), a handler that overrides it, and a controller with no class-level gate.
@Roles("admin")
class ClassGatedController {
  classOnly(): void {}

  @Roles("admin", "employee")
  handlerOverride(): void {}
}

class UngatedController {
  open(): void {}

  @Roles("admin")
  handlerGated(): void {}
}

function contextFor(
  controllerClass: new () => unknown,
  handler: (...args: unknown[]) => unknown,
  user: unknown,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controllerClass,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard (#384 class-level enforcement)", () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  it("ENFORCES a class-level @Roles — blocks a user missing the role (the bug)", () => {
    const ctx = contextFor(ClassGatedController, ClassGatedController.prototype.classOnly, {
      roles: ["employee"],
    });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("allows a class-level @Roles when the user has the role", () => {
    const ctx = contextFor(ClassGatedController, ClassGatedController.prototype.classOnly, {
      roles: ["admin"],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("lets a handler-level @Roles override the class default", () => {
    // Class requires admin; handler widens to admin|employee → employee passes.
    const ctx = contextFor(ClassGatedController, ClassGatedController.prototype.handlerOverride, {
      roles: ["employee"],
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("keeps handler-level-only @Roles working (unchanged behaviour)", () => {
    const ctx = contextFor(UngatedController, UngatedController.prototype.handlerGated, {
      roles: ["employee"],
    });
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("allows when neither class nor handler declares @Roles", () => {
    const ctx = contextFor(UngatedController, UngatedController.prototype.open, { roles: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("denies (does not throw) when the request has no roles array", () => {
    const ctx = contextFor(ClassGatedController, ClassGatedController.prototype.classOnly, {});
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it("denies (does not throw) when there is no user at all", () => {
    const ctx = contextFor(
      ClassGatedController,
      ClassGatedController.prototype.classOnly,
      undefined,
    );
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
