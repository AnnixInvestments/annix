import type { ExecutionContext } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import type { UserAppAccessRepository } from "../../rbac/rbac.repository";
import type { UserRepository } from "../../user/user.repository";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import type { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import type { CandidateRepository } from "../repositories/candidate.repository";
import { AnnixOrbitAuthGuard } from "./annix-orbit-auth.guard";

interface GuardOverrides {
  payload: Record<string, unknown>;
  rbacRoleCode?: string | null;
  recruiterRole?: string | null;
  profile?: Record<string, unknown> | null;
  teamMembers?: Array<Record<string, unknown>>;
}

function contextFor(): { context: ExecutionContext; request: { user?: unknown } } {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: { authorization: "Bearer token" },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

function guardFor(overrides: GuardOverrides): AnnixOrbitAuthGuard {
  const jwtService = {
    verify: () => overrides.payload,
  } as unknown as JwtService;
  const configService = {
    get: () => "secret",
  } as unknown as ConfigService;
  const userRepo = {
    findById: async () => ({ id: 42, email: "seeker@example.com" }),
  } as unknown as UserRepository;
  const userAppAccessRepo = {
    findByUserAndAppCodeWithRole: async () =>
      overrides.rbacRoleCode ? { role: { code: overrides.rbacRoleCode } } : null,
  } as unknown as UserAppAccessRepository;
  const candidateRepo = {
    touchLastActiveByEmail: async () => null,
  } as unknown as CandidateRepository;
  const profileRepo = {
    findByUserId: async () =>
      overrides.profile ?? {
        id: 1,
        userId: 42,
        companyId: 7,
        userType: "company",
        recruiterRole: overrides.recruiterRole ?? null,
      },
    teamMembers: async () =>
      overrides.teamMembers ?? [
        {
          id: 1,
          userId: 42,
          companyId: 7,
          userType: "company",
        },
      ],
  } as unknown as AnnixOrbitProfileRepository;
  return new AnnixOrbitAuthGuard(
    jwtService,
    configService,
    userRepo,
    userAppAccessRepo,
    candidateRepo,
    profileRepo,
  );
}

describe("AnnixOrbitAuthGuard role resolution", () => {
  it("resolves an individual userType to the INDIVIDUAL role without touching RBAC", async () => {
    const { context, request } = contextFor();
    const guard = guardFor({
      payload: { type: "annix-orbit", sub: 42, userType: "individual" },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.user as { role: string }).role).toBe(AnnixOrbitRole.INDIVIDUAL);
  });

  it("maps the individual RBAC code explicitly rather than via the signed fallback", async () => {
    const { context, request } = contextFor();
    const guard = guardFor({
      payload: { type: "annix-orbit", sub: 42, userType: "company", role: "stale-claim" },
      rbacRoleCode: "individual",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.user as { role: string }).role).toBe(AnnixOrbitRole.INDIVIDUAL);
  });

  it("maps the student RBAC code explicitly rather than via the signed fallback", async () => {
    const { context, request } = contextFor();
    const guard = guardFor({
      payload: { type: "annix-orbit", sub: 42, userType: "student", role: "stale-claim" },
      rbacRoleCode: "student",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.user as { role: string }).role).toBe(AnnixOrbitRole.STUDENT);
  });

  it("keeps the company RBAC code mapping intact", async () => {
    const { context, request } = contextFor();
    const guard = guardFor({
      payload: { type: "annix-orbit", sub: 42, userType: "company" },
      rbacRoleCode: "administrator",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.user as { role: string }).role).toBe(AnnixOrbitRole.ADMIN);
  });

  it("upgrades the first company profile to admin even when RBAC is stale viewer", async () => {
    const { context, request } = contextFor();
    const guard = guardFor({
      payload: { type: "annix-orbit", sub: 42, userType: "company", role: "viewer" },
      rbacRoleCode: "viewer",
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.user as { role: string }).role).toBe(AnnixOrbitRole.ADMIN);
  });

  it("keeps later company profiles as viewer when RBAC is viewer", async () => {
    const { context, request } = contextFor();
    const guard = guardFor({
      payload: { type: "annix-orbit", sub: 42, userType: "company", role: "viewer" },
      rbacRoleCode: "viewer",
      profile: { id: 5, userId: 42, companyId: 7, userType: "company" },
      teamMembers: [
        { id: 1, userId: 21, companyId: 7, userType: "company" },
        { id: 5, userId: 42, companyId: 7, userType: "company" },
      ],
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request.user as { role: string }).role).toBe(AnnixOrbitRole.VIEWER);
  });

  it("rejects a token of the wrong type", async () => {
    const { context } = contextFor();
    const guard = guardFor({
      payload: { type: "stock-control", sub: 42, userType: "individual" },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
