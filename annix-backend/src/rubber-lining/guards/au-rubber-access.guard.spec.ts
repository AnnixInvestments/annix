import type { ExecutionContext } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { RbacService } from "../../rbac/rbac.service";
import { AuRubberAccessGuard } from "./au-rubber-access.guard";

describe("AuRubberAccessGuard", () => {
  it("resolves RBAC from the app module graph before checking access", async () => {
    const userAccessDetails = jest.fn().mockResolvedValue({
      hasAccess: true,
      permissions: ["orders.read"],
      roleCode: "operator",
    });
    const moduleRef = {
      get: jest.fn().mockReturnValue({ userAccessDetails }),
    } as unknown as ModuleRef;
    const guard = new AuRubberAccessGuard(moduleRef);
    const request = {
      user: { id: "user-1", roles: [] as string[] },
      auRubberPermissions: null as string[] | null,
      auRubberRole: null as string | null,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(moduleRef.get).toHaveBeenCalledWith(RbacService, { strict: false });
    expect(userAccessDetails).toHaveBeenCalledWith("user-1", "au-rubber");
    expect(request.auRubberPermissions).toEqual(["orders.read"]);
    expect(request.auRubberRole).toBe("operator");
  });

  it("does not resolve RBAC when the request has no user id", async () => {
    const moduleRef = {
      get: jest.fn(),
    } as unknown as ModuleRef;
    const guard = new AuRubberAccessGuard(moduleRef);
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: null }) }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(false);

    expect(moduleRef.get).not.toHaveBeenCalled();
  });
});
