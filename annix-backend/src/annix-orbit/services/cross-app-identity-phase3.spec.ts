import { UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import type { EmailService } from "../../email/email.service";
import type { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import type { CompanyRepository } from "../../platform/company.repository";
import type {
  AppRepository,
  AppRoleRepository,
  UserAppAccessRepository,
} from "../../rbac/rbac.repository";
import type { AuthConfigService } from "../../shared/auth/auth-config.service";
import type { PasswordService } from "../../shared/auth/password.service";
import type { User } from "../../user/entities/user.entity";
import type { UserRepository } from "../../user/user.repository";
import { OrbitAccountSelectionRequiredException } from "../identity/orbit-account-selection.exception";
import {
  OrbitIdentityResolver,
  type OrbitLoginCandidate,
} from "../identity/orbit-identity-resolver";
import type { OrbitIdentityWriter } from "../identity/orbit-identity-writer";
import type { IdentityRegistryRepository } from "../identity/repositories/identity-registry.repository";
import type { OrbitCompanyIdentityRepository } from "../identity/repositories/orbit-company-identity.repository";
import type { OrbitRecruiterIdentityRepository } from "../identity/repositories/orbit-recruiter-identity.repository";
import type { OrbitSeekerIdentityRepository } from "../identity/repositories/orbit-seeker-identity.repository";
import type { OrbitStudentIdentityRepository } from "../identity/repositories/orbit-student-identity.repository";
import type { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import type { AnnixOrbitEeConsentTextVersionRepository } from "../repositories/annix-orbit-ee-consent-text-version.repository";
import type { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import type { AnnixOrbitTeamInviteRepository } from "../repositories/annix-orbit-team-invite.repository";
import type { OrbitEarlyAccessSignupRepository } from "../repositories/orbit-early-access-signup.repository";
import { AnnixOrbitAuthService } from "./auth.service";

/**
 * Cross-app identity isolation (Phase 3 / S3 / M3). Locks the two properties the
 * per-module split exists to guarantee:
 *   1. STORAGE isolation — with READ on, a company login reads ONLY the company
 *      store; a seeker row is structurally unreachable even if a module is forged.
 *   2. Password-first disambiguation — one email+password matching multiple
 *      module accounts yields a 409, never a silent cross-module login (#389).
 */

function userRow(id: number, scope: string): User {
  return { id, email: "u@x.com", appScope: scope, passwordHash: `h${id}` } as unknown as User;
}

describe("Phase 3 — per-module storage isolation (READ on)", () => {
  it("a company login can never resolve a seeker row even if the seeker store has one", async () => {
    const flags = {
      isEnabled: jest.fn(async () => true),
    } as unknown as FeatureFlagsService;
    const userRepo = {
      findById: jest.fn(async (id: number) => userRow(id, "orbit:company")),
      findOneByEmailAndScope: jest.fn(async () => null),
      findOrbitUserByEmail: jest.fn(async () => null),
    } as unknown as jest.Mocked<UserRepository>;
    const registry = {
      findByEmailLower: jest.fn(async () => []),
    } as unknown as jest.Mocked<IdentityRegistryRepository>;
    const company = { findByEmailLower: jest.fn(async () => ({ id: 1 }) as never) };
    const seeker = { findByEmailLower: jest.fn(async () => ({ id: 2 }) as never) };
    const recruiter = { findByEmailLower: jest.fn(async () => null) };
    const student = { findByEmailLower: jest.fn(async () => null) };

    const resolver = new OrbitIdentityResolver(
      userRepo,
      registry,
      flags,
      company as unknown as OrbitCompanyIdentityRepository,
      seeker as unknown as OrbitSeekerIdentityRepository,
      recruiter as unknown as OrbitRecruiterIdentityRepository,
      student as unknown as OrbitStudentIdentityRepository,
    );

    const candidates = await resolver.resolveLoginCandidates("u@x.com", "company");

    expect(candidates).toHaveLength(1);
    expect(candidates[0].module).toBe("company");
    expect(candidates[0].user.id).toBe(1);
    // The seeker store is never even consulted for a company login.
    expect(seeker.findByEmailLower).not.toHaveBeenCalled();
  });
});

function makeAuthService(
  candidates: OrbitLoginCandidate[],
  verify: (password: string, hash: string) => boolean,
) {
  const noop = {} as never;
  const passwordService = {
    verify: jest.fn(async (password: string, hash: string) => verify(password, hash)),
  } as unknown as PasswordService;
  const resolver = {
    resolveLoginCandidates: jest.fn(async () => candidates),
  } as unknown as OrbitIdentityResolver;
  const writer = { recordLogin: jest.fn(async () => undefined) } as unknown as OrbitIdentityWriter;

  const service = new AnnixOrbitAuthService(
    noop as UserRepository,
    noop as AnnixOrbitProfileRepository,
    noop as CompanyRepository,
    noop as AnnixOrbitCompanyRepository,
    noop as AppRepository,
    noop as AppRoleRepository,
    noop as UserAppAccessRepository,
    noop as JwtService,
    noop as ConfigService,
    noop as EmailService,
    passwordService,
    noop as AuthConfigService,
    noop as AnnixOrbitEeConsentTextVersionRepository,
    noop as AnnixOrbitTeamInviteRepository,
    noop as OrbitEarlyAccessSignupRepository,
    resolver,
    writer,
  );
  return { service };
}

describe("Phase 3 — login password-first disambiguation", () => {
  it("throws 409 ACCOUNT_SELECTION_REQUIRED when one password matches multiple modules", async () => {
    const candidates: OrbitLoginCandidate[] = [
      { module: "company", user: userRow(1, "orbit:company") },
      { module: "seeker", user: userRow(2, "orbit:seeker") },
    ];
    const { service } = makeAuthService(candidates, () => true);

    await expect(service.login("u@x.com", "pw")).rejects.toBeInstanceOf(
      OrbitAccountSelectionRequiredException,
    );

    try {
      await service.login("u@x.com", "pw");
      throw new Error("expected rejection");
    } catch (error) {
      const body = (error as OrbitAccountSelectionRequiredException).getResponse() as {
        code: string;
        availableAccountTypes: string[];
      };
      expect(body.code).toBe("ACCOUNT_SELECTION_REQUIRED");
      // seeker module's account-type label is the INDIVIDUAL user type.
      expect(body.availableAccountTypes).toEqual(["company", "individual"]);
    }
  });

  it("rejects with Invalid credentials when no candidate exists", async () => {
    const { service } = makeAuthService([], () => true);
    await expect(service.login("u@x.com", "pw")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects with Invalid credentials when the password matches none", async () => {
    const candidates: OrbitLoginCandidate[] = [
      { module: "company", user: userRow(1, "orbit:company") },
    ];
    const { service } = makeAuthService(candidates, () => false);
    await expect(service.login("u@x.com", "pw")).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
