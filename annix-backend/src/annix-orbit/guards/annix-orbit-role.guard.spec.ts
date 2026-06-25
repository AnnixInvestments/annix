import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitRoleGuard } from "./annix-orbit-role.guard";

function contextFor(role: AnnixOrbitRole | null): ExecutionContext {
  const request = { user: role ? { role } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => null,
    getClass: () => null,
  } as unknown as ExecutionContext;
}

function guardWithRequiredRoles(requiredRoles: AnnixOrbitRole[] | null): AnnixOrbitRoleGuard {
  const reflector = {
    getAllAndOverride: () => requiredRoles,
  } as unknown as Reflector;
  return new AnnixOrbitRoleGuard(reflector);
}

function canActivate(role: AnnixOrbitRole | null, requiredRoles: AnnixOrbitRole[] | null): boolean {
  return guardWithRequiredRoles(requiredRoles).canActivate(contextFor(role));
}

describe("AnnixOrbitRoleGuard", () => {
  describe("seeker / student horizontal isolation", () => {
    it("denies an individual access to a student-only route", () => {
      expect(() => canActivate(AnnixOrbitRole.INDIVIDUAL, [AnnixOrbitRole.STUDENT])).toThrow(
        ForbiddenException,
      );
    });

    it("denies a student access to an individual-only route", () => {
      expect(() => canActivate(AnnixOrbitRole.STUDENT, [AnnixOrbitRole.INDIVIDUAL])).toThrow(
        ForbiddenException,
      );
    });

    it("admits an individual to an individual-only route", () => {
      expect(canActivate(AnnixOrbitRole.INDIVIDUAL, [AnnixOrbitRole.INDIVIDUAL])).toBe(true);
    });

    it("admits a student to a student-only route", () => {
      expect(canActivate(AnnixOrbitRole.STUDENT, [AnnixOrbitRole.STUDENT])).toBe(true);
    });
  });

  describe("recruiter cannot reach seeker or student routes", () => {
    it("denies a recruiter access to a seeker-only route", () => {
      expect(() => canActivate(AnnixOrbitRole.RECRUITER, [AnnixOrbitRole.INDIVIDUAL])).toThrow(
        ForbiddenException,
      );
    });

    it("denies a recruiter access to a student-only route", () => {
      expect(() => canActivate(AnnixOrbitRole.RECRUITER, [AnnixOrbitRole.STUDENT])).toThrow(
        ForbiddenException,
      );
    });

    it("denies a viewer access to a seeker-only route", () => {
      expect(() => canActivate(AnnixOrbitRole.VIEWER, [AnnixOrbitRole.INDIVIDUAL])).toThrow(
        ForbiddenException,
      );
    });
  });

  describe("company-side hierarchy is preserved", () => {
    it("admits a viewer to a viewer-gated route", () => {
      expect(canActivate(AnnixOrbitRole.VIEWER, [AnnixOrbitRole.VIEWER])).toBe(true);
    });

    it("admits a recruiter to a viewer-gated route", () => {
      expect(canActivate(AnnixOrbitRole.RECRUITER, [AnnixOrbitRole.VIEWER])).toBe(true);
    });

    it("admits a recruiter to a recruiter-gated route", () => {
      expect(canActivate(AnnixOrbitRole.RECRUITER, [AnnixOrbitRole.RECRUITER])).toBe(true);
    });

    it("denies a viewer access to a recruiter-gated route", () => {
      expect(() => canActivate(AnnixOrbitRole.VIEWER, [AnnixOrbitRole.RECRUITER])).toThrow(
        ForbiddenException,
      );
    });

    it("denies a recruiter access to an admin-gated route", () => {
      expect(() => canActivate(AnnixOrbitRole.RECRUITER, [AnnixOrbitRole.ADMIN])).toThrow(
        ForbiddenException,
      );
    });
  });

  describe("admin reaches everything", () => {
    it.each([
      [AnnixOrbitRole.VIEWER],
      [AnnixOrbitRole.RECRUITER],
      [AnnixOrbitRole.ADMIN],
      [AnnixOrbitRole.INDIVIDUAL],
      [AnnixOrbitRole.STUDENT],
    ])("admits an admin to a %s-gated route", (required) => {
      expect(canActivate(AnnixOrbitRole.ADMIN, [required])).toBe(true);
    });
  });

  describe("routes listing multiple roles admit each listed role", () => {
    it("admits a recruiter to a recruiter-or-individual route", () => {
      expect(
        canActivate(AnnixOrbitRole.RECRUITER, [
          AnnixOrbitRole.RECRUITER,
          AnnixOrbitRole.INDIVIDUAL,
        ]),
      ).toBe(true);
    });

    it("admits an individual to a recruiter-or-individual route", () => {
      expect(
        canActivate(AnnixOrbitRole.INDIVIDUAL, [
          AnnixOrbitRole.RECRUITER,
          AnnixOrbitRole.INDIVIDUAL,
        ]),
      ).toBe(true);
    });

    it("admits a student to a student-or-individual route", () => {
      expect(
        canActivate(AnnixOrbitRole.STUDENT, [AnnixOrbitRole.STUDENT, AnnixOrbitRole.INDIVIDUAL]),
      ).toBe(true);
    });
  });

  describe("individual-only seeker route (e.g. seeker/jobs) isolation", () => {
    const seekerRouteRoles = [AnnixOrbitRole.INDIVIDUAL];

    it("admits an individual seeker", () => {
      expect(canActivate(AnnixOrbitRole.INDIVIDUAL, seekerRouteRoles)).toBe(true);
    });

    it("denies a student session", () => {
      expect(() => canActivate(AnnixOrbitRole.STUDENT, seekerRouteRoles)).toThrow(
        ForbiddenException,
      );
    });

    it("denies a recruiter session", () => {
      expect(() => canActivate(AnnixOrbitRole.RECRUITER, seekerRouteRoles)).toThrow(
        ForbiddenException,
      );
    });

    it("denies a viewer session", () => {
      expect(() => canActivate(AnnixOrbitRole.VIEWER, seekerRouteRoles)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe("unprotected and unauthenticated cases", () => {
    it("allows when no roles are required", () => {
      expect(canActivate(AnnixOrbitRole.VIEWER, null)).toBe(true);
    });

    it("allows when the required-roles list is empty", () => {
      expect(canActivate(AnnixOrbitRole.VIEWER, [])).toBe(true);
    });

    it("denies a request with no role on the user", () => {
      expect(() => canActivate(null, [AnnixOrbitRole.VIEWER])).toThrow(ForbiddenException);
    });
  });
});
