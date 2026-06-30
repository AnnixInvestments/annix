import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import type { User } from "../../user/entities/user.entity";
import type { UserRepository } from "../../user/user.repository";
import { AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import type { OrbitLoginCandidate } from "../identity/orbit-identity-resolver";
import type { OrbitModule } from "../identity/orbit-module";
import { AnnixOrbitAuthService } from "./auth.service";

/**
 * #427 regression: an Orbit login's JWT `userType` (and companyId/recruiterRole)
 * must follow the MODULE the user authenticated as — never an incidentally-
 * attached profile. A seeker (orbit:seeker) login with a stray COMPANY profile on
 * the same userId must still yield an individual session with no companyId.
 */

function userRow(id: number, scope: string): User {
  return {
    id,
    email: "u@x.com",
    appScope: scope,
    passwordHash: "h",
    status: "active",
    emailVerified: true,
  } as unknown as User;
}

function candidate(module: OrbitModule, id: number, scope: string): OrbitLoginCandidate {
  return { module, user: userRow(id, scope) };
}

function build(opts: {
  candidate: OrbitLoginCandidate;
  profile: Record<string, unknown> | null;
  access?: { role: { code: string } } | null;
  teamMembers?: Array<Record<string, unknown>>;
}) {
  const signed: Array<Record<string, unknown>> = [];
  const noop = {} as never;

  const profileRepo = {
    findByUserId: jest.fn(async () => opts.profile),
    create: jest.fn(async (p: Record<string, unknown>) => ({ id: 99, ...p })),
    teamMembers: jest.fn(async () => opts.teamMembers ?? []),
  };
  const userRepo = {
    save: jest.fn(async (u: User) => u),
  } as unknown as jest.Mocked<UserRepository>;
  const userAppAccessRepo = {
    findByUserAndAppCodeWithRole: jest.fn(async () => opts.access ?? null),
    findOneByUserAndApp: jest.fn(async () => ({ id: 1 })),
  };
  const appRepo = { findByCode: jest.fn(async () => ({ id: 1, code: "annix-orbit" })) };
  const jwtService = {
    sign: jest.fn((payload: Record<string, unknown>) => {
      signed.push(payload);
      return "token";
    }),
  } as unknown as JwtService;
  const configService = { get: jest.fn(() => "test-secret-value") } as unknown as ConfigService;
  const passwordService = { verify: jest.fn(async () => true) };
  const authConfigService = { isEmailVerificationDisabled: () => true };
  const identityResolver = { resolveLoginCandidates: jest.fn(async () => [opts.candidate]) };
  const identityWriter = { recordLogin: jest.fn(async () => undefined) };

  const service = new AnnixOrbitAuthService(
    userRepo,
    profileRepo as never,
    noop,
    noop,
    appRepo as never,
    noop,
    userAppAccessRepo as never,
    jwtService,
    configService,
    noop,
    passwordService as never,
    authConfigService as never,
    noop,
    noop,
    noop,
    identityResolver as never,
    identityWriter as never,
  );
  return { service, signed, profileRepo };
}

describe("Orbit login session type (#427)", () => {
  it("a seeker login with a STRAY COMPANY profile yields an individual session, no companyId", async () => {
    const { service, signed } = build({
      candidate: candidate("seeker", 3, "orbit:seeker"),
      // Corrupt/cross-module profile on the seeker's userId (andy: companyId 19).
      profile: { userId: 3, userType: AnnixOrbitUserType.COMPANY, companyId: 19 },
    });

    const result = await service.login("u@x.com", "pw", "individual");

    expect(result.user.userType).toBe(AnnixOrbitUserType.INDIVIDUAL);
    const accessPayload = signed[0];
    expect(accessPayload.sub).toBe(3);
    expect(accessPayload.userType).toBe(AnnixOrbitUserType.INDIVIDUAL);
    expect(accessPayload.companyId).toBeNull();
    expect(accessPayload.recruiterRole).toBeNull();
    expect(result.user.role).toBe("individual");
  });

  it("a clean seeker login (profile auto-provisioned) is an individual session", async () => {
    const { service, signed } = build({
      candidate: candidate("seeker", 3, "orbit:seeker"),
      profile: null,
    });

    const result = await service.login("u@x.com", "pw", "individual");

    expect(result.user.userType).toBe(AnnixOrbitUserType.INDIVIDUAL);
    expect(signed[0].companyId).toBeNull();
  });

  it("a company login stays a company session and carries its companyId", async () => {
    const { service, signed } = build({
      candidate: candidate("company", 7, "orbit:company"),
      profile: { userId: 7, userType: AnnixOrbitUserType.COMPANY, companyId: 19 },
      access: { role: { code: "administrator" } },
    });

    const result = await service.login("u@x.com", "pw", "company");

    expect(result.user.userType).toBe(AnnixOrbitUserType.COMPANY);
    expect(signed[0].userType).toBe(AnnixOrbitUserType.COMPANY);
    expect(signed[0].companyId).toBe(19);
  });

  it("a first company profile is admin even if its RBAC row is stale viewer", async () => {
    const { service, signed } = build({
      candidate: candidate("company", 7, "orbit:company"),
      profile: { id: 2, userId: 7, userType: AnnixOrbitUserType.COMPANY, companyId: 19 },
      access: { role: { code: "viewer" } },
      teamMembers: [{ id: 2, userId: 7, userType: AnnixOrbitUserType.COMPANY, companyId: 19 }],
    });

    const result = await service.login("u@x.com", "pw", "company");

    expect(result.user.role).toBe("admin");
    expect(signed[0].role).toBe("admin");
  });

  it("a recruiter login stays a recruiter session with its companyId + recruiterRole", async () => {
    const { service, signed } = build({
      candidate: candidate("recruiter", 8, "orbit:recruiter"),
      profile: {
        userId: 8,
        userType: AnnixOrbitUserType.RECRUITER,
        companyId: 5,
        recruiterRole: "owner",
      },
      access: { role: { code: "editor" } },
    });

    const result = await service.login("u@x.com", "pw", "recruiter");

    expect(result.user.userType).toBe(AnnixOrbitUserType.RECRUITER);
    expect(signed[0].companyId).toBe(5);
    expect(signed[0].recruiterRole).toBe("owner");
  });

  it("a student login stays a student session with no companyId", async () => {
    const { service, signed } = build({
      candidate: candidate("student", 9, "orbit:student"),
      profile: { userId: 9, userType: AnnixOrbitUserType.STUDENT, companyId: null },
    });

    const result = await service.login("u@x.com", "pw", "student");

    expect(result.user.userType).toBe(AnnixOrbitUserType.STUDENT);
    expect(result.user.role).toBe("student");
    expect(signed[0].companyId).toBeNull();
  });
});
