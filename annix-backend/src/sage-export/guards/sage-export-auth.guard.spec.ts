import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { fromISO } from "../../lib/datetime";
import { SageExportAuthGuard } from "./sage-export-auth.guard";

describe("SageExportAuthGuard", () => {
  const buildContext = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  const buildGuard = (overrides: {
    verify?: () => any;
    profile?: any;
    user?: any;
    app?: any;
    access?: any;
  }) => {
    const jwtService = {
      verify: overrides.verify ?? (() => ({ sub: 7, type: "stock-control" })),
    } as any;
    const profileRepo = {
      findOneByUserId: jest.fn().mockResolvedValue(overrides.profile ?? null),
    } as any;
    const userRepo = {
      findByIdWithRoles: jest.fn().mockResolvedValue(overrides.user ?? null),
    } as any;
    const appRepo = {
      findOneWhere: jest.fn().mockResolvedValue(overrides.app ?? null),
    } as any;
    const userAppAccessRepo = {
      findOneByUserAndAppWithRole: jest.fn().mockResolvedValue(overrides.access ?? null),
    } as any;

    return new SageExportAuthGuard(jwtService, profileRepo, userRepo, appRepo, userAppAccessRepo);
  };

  describe("authentication", () => {
    it("rejects a request with no authorization header", async () => {
      const guard = buildGuard({});
      const request = { headers: {}, params: { moduleCode: "stock-control" } };

      await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("rejects a request with a non-bearer authorization header", async () => {
      const guard = buildGuard({});
      const request = {
        headers: { authorization: "Basic abc" },
        params: { moduleCode: "stock-control" },
      };

      await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("rejects an invalid/expired token", async () => {
      const guard = buildGuard({
        verify: () => {
          throw new Error("jwt expired");
        },
      });
      const request = {
        headers: { authorization: "Bearer bad" },
        params: { moduleCode: "stock-control" },
      };

      await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("rejects a refresh token", async () => {
      const guard = buildGuard({
        verify: () => ({ sub: 7, type: "stock-control", tokenType: "refresh" }),
      });
      const request = {
        headers: { authorization: "Bearer refresh" },
        params: { moduleCode: "stock-control" },
      };

      await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe("company resolution (query param ignored)", () => {
    it("derives stock-control companyId from the profile, ignoring a forged companyId query param", async () => {
      const guard = buildGuard({
        verify: () => ({ sub: 7, type: "stock-control" }),
        profile: { companyId: 42 },
      });
      const request = {
        headers: { authorization: "Bearer good" },
        params: { moduleCode: "stock-control" },
        query: { companyId: "999" },
      };

      const allowed = await guard.canActivate(buildContext(request));

      expect(allowed).toBe(true);
      expect(request).toHaveProperty("sageExport");
      expect((request as any).sageExport.companyId).toBe(42);
      expect((request as any).sageExport.appKey).toBe("stock-control");
    });

    it("rejects a stock-control request with no profile", async () => {
      const guard = buildGuard({
        verify: () => ({ sub: 7, type: "stock-control" }),
        profile: null,
      });
      const request = {
        headers: { authorization: "Bearer good" },
        params: { moduleCode: "stock-control" },
      };

      await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe("module authorization", () => {
    it("denies a stock-control user requesting the au-rubber module", async () => {
      const guard = buildGuard({
        verify: () => ({ sub: 7, type: "stock-control", roles: [] }),
        app: { id: 3, code: "au-rubber" },
        access: null,
      });
      const request = {
        headers: { authorization: "Bearer good" },
        params: { moduleCode: "au-rubber" },
      };

      await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("allows an entitled au-rubber user and derives companyId from the user", async () => {
      const guard = buildGuard({
        verify: () => ({ sub: 11, type: "admin", roles: [] }),
        app: { id: 3, code: "au-rubber" },
        access: { id: 1, expiresAt: null },
        user: { id: 11, companyId: 8 },
      });
      const request = {
        headers: { authorization: "Bearer good" },
        params: { moduleCode: "au-rubber" },
        query: { companyId: "999" },
      };

      const allowed = await guard.canActivate(buildContext(request));

      expect(allowed).toBe(true);
      expect((request as any).sageExport.companyId).toBe(8);
      expect((request as any).sageExport.appKey).toBe("au-rubber");
    });

    it("allows an admin-role user the au-rubber module without an explicit access grant", async () => {
      const guard = buildGuard({
        verify: () => ({ sub: 11, type: "admin", roles: ["admin"] }),
        user: { id: 11, companyId: 8 },
      });
      const request = {
        headers: { authorization: "Bearer good" },
        params: { moduleCode: "au-rubber" },
      };

      const allowed = await guard.canActivate(buildContext(request));

      expect(allowed).toBe(true);
      expect((request as any).sageExport.allowedModules).toContain("au-rubber");
    });

    it("denies an expired au-rubber access grant", async () => {
      const guard = buildGuard({
        verify: () => ({ sub: 11, type: "admin", roles: [] }),
        app: { id: 3, code: "au-rubber" },
        access: { id: 1, expiresAt: fromISO("2000-01-01").toJSDate() },
      });
      const request = {
        headers: { authorization: "Bearer good" },
        params: { moduleCode: "au-rubber" },
      };

      await expect(guard.canActivate(buildContext(request))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe("adapters listing", () => {
    it("scopes allowedModules to the caller's entitlements (stock-control only)", async () => {
      const guard = buildGuard({
        verify: () => ({ sub: 7, type: "stock-control", roles: [] }),
        app: { id: 3, code: "au-rubber" },
        access: null,
      });
      const request = { headers: { authorization: "Bearer good" }, params: {} };

      const allowed = await guard.canActivate(buildContext(request));

      expect(allowed).toBe(true);
      expect((request as any).sageExport.allowedModules).toEqual(["stock-control"]);
    });
  });
});
