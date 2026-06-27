import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import type { EmailService } from "../../email/email.service";
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
import { AnnixOrbitUserType } from "../entities/annix-orbit-profile.entity";
import type { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import type { AnnixOrbitEeConsentTextVersionRepository } from "../repositories/annix-orbit-ee-consent-text-version.repository";
import type { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";
import type { AnnixOrbitTeamInviteRepository } from "../repositories/annix-orbit-team-invite.repository";
import type { OrbitEarlyAccessSignupRepository } from "../repositories/orbit-early-access-signup.repository";
import { AnnixOrbitAuthService } from "./auth.service";

/**
 * Cross-app identity isolation guard (Phase 1).
 *
 * The `user` collection is SHARED across every Annix app, partitioned by
 * `appScope` (`orbit:*` vs non-orbit). The invariant this spec locks:
 *
 *   Registering / provisioning / authenticating into Orbit must NEVER read,
 *   claim, or mutate a NON-orbit record. Each email has its own per-app
 *   record. Stamping `orbit:*` onto a Forge/customer record (the original
 *   bug) silently hijacked that customer's login.
 *
 * These tests are written to FAIL against the pre-fix code (which stamped
 * `appScope` in `provisionInvitedSeekerProfile` and fell back to the
 * un-scoped `findOneByEmail` in `resolveOrbitLoginUser`) and PASS after.
 */

const ORBIT_SCOPE_BY_TYPE: Record<AnnixOrbitUserType, string> = {
  [AnnixOrbitUserType.COMPANY]: "orbit:company",
  [AnnixOrbitUserType.RECRUITER]: "orbit:recruiter",
  [AnnixOrbitUserType.INDIVIDUAL]: "orbit:seeker",
  [AnnixOrbitUserType.STUDENT]: "orbit:student",
};

function isOrbitScope(scope: string | null): boolean {
  return typeof scope === "string" && scope.startsWith("orbit:");
}

/**
 * A minimal in-memory stand-in for the shared `user` collection whose lookup
 * methods reproduce the real Mongo repository's scope partitioning:
 *  - `findOneByEmail` / `findByEmailWithRoles` => NON-orbit records only
 *  - `findOrbitUserByEmail` => orbit-scoped records only
 *  - `findOneByEmailAndScope` => exact-scope match only
 */
function makeUserRepo(seed: User[]) {
  const rows = [...seed];
  const byEmail = (email: string) =>
    rows.filter((r) => r.email.toLowerCase() === email.toLowerCase());

  return {
    rows,
    findOneByEmail: jest.fn(
      async (email: string) => byEmail(email).find((r) => !isOrbitScope(r.appScope)) ?? null,
    ),
    findByEmailWithRoles: jest.fn(
      async (email: string) => byEmail(email).find((r) => !isOrbitScope(r.appScope)) ?? null,
    ),
    findOrbitUserByEmail: jest.fn(
      async (email: string) => byEmail(email).find((r) => isOrbitScope(r.appScope)) ?? null,
    ),
    findOneByEmailAndScope: jest.fn(
      async (email: string, scope: string) =>
        byEmail(email).find((r) => r.appScope === scope) ?? null,
    ),
    findById: jest.fn(async (id: number) => rows.find((r) => r.id === id) ?? null),
    create: jest.fn(async (data: Partial<User>) => {
      const created = { id: rows.length + 100, ...data } as User;
      rows.push(created);
      return created;
    }),
    save: jest.fn(async (u: User) => u),
  } as unknown as jest.Mocked<UserRepository> & { rows: User[] };
}

function makeService(
  userRepo: jest.Mocked<UserRepository>,
  overrides?: {
    profileRepo?: Partial<AnnixOrbitProfileRepository>;
    appRepo?: Partial<AppRepository>;
    userAppAccessRepo?: Partial<UserAppAccessRepository>;
  },
) {
  const profileRepo = {
    findByUserId: jest.fn().mockResolvedValue(null),
    create: jest.fn(async (data) => ({ id: 1, ...data })),
    save: jest.fn(async (p) => p),
    ...overrides?.profileRepo,
  } as unknown as AnnixOrbitProfileRepository;
  const appRepo = {
    findByCode: jest.fn().mockResolvedValue({ id: 1, code: "annix-orbit" }),
    ...overrides?.appRepo,
  } as unknown as AppRepository;
  const userAppAccessRepo = {
    findOneByUserAndApp: jest.fn().mockResolvedValue({ id: 1 }),
    ...overrides?.userAppAccessRepo,
  } as unknown as UserAppAccessRepository;

  const noop = {} as never;
  const service = new AnnixOrbitAuthService(
    userRepo,
    profileRepo,
    noop as CompanyRepository,
    noop as AnnixOrbitCompanyRepository,
    appRepo,
    noop as AppRoleRepository,
    userAppAccessRepo,
    noop as JwtService,
    noop as ConfigService,
    noop as EmailService,
    noop as PasswordService,
    noop as AuthConfigService,
    noop as AnnixOrbitEeConsentTextVersionRepository,
    noop as AnnixOrbitTeamInviteRepository,
    noop as OrbitEarlyAccessSignupRepository,
    noop,
    noop,
  );
  return { service, profileRepo, appRepo, userAppAccessRepo };
}

function customerRecord(): User {
  return {
    id: 1,
    email: "shared.user@example.com",
    username: "shared.user@example.com",
    passwordHash: "CUSTOMER_HASH",
    appScope: null,
    emailVerified: true,
    status: "active",
  } as unknown as User;
}

describe("Cross-app identity isolation (Phase 1 guard)", () => {
  it("provisionInvitedSeekerProfile must NOT stamp appScope or touch a non-orbit record", async () => {
    const customer = customerRecord();
    const userRepo = makeUserRepo([customer]);
    const { service } = makeService(userRepo);

    // The seeker being provisioned must be an orbit-scoped record (the only
    // kind resolveOrbitLoginUser hands to this method post-fix). Provisioning
    // it must leave the SEPARATE customer record completely untouched.
    const orbitSeeker = {
      id: 2,
      email: "shared.user@example.com",
      appScope: "orbit:seeker",
      passwordHash: "ORBIT_HASH",
      emailVerified: true,
    } as unknown as User;
    userRepo.rows.push(orbitSeeker);

    await (
      service as unknown as {
        provisionInvitedSeekerProfile: (u: User) => Promise<unknown>;
      }
    ).provisionInvitedSeekerProfile(orbitSeeker);

    // Guard: the customer record's identity fields are unchanged — not stamped
    // to orbit, not re-hashed.
    expect(customer.appScope).toBeNull();
    expect(customer.passwordHash).toBe("CUSTOMER_HASH");

    // Guard: the customer is still resolvable via the NON-orbit lookup.
    const stillCustomer = await userRepo.findByEmailWithRoles("shared.user@example.com");
    expect(stillCustomer).not.toBeNull();
    expect(stillCustomer?.id).toBe(1);
    expect(stillCustomer?.appScope).toBeNull();
  });

  it("provisionInvitedSeekerProfile must NOT stamp appScope onto a scope-less record", async () => {
    // This locks the exact pre-fix bug at auth.service.ts:956: a scope-less
    // record passed in was stamped to orbit:seeker. A scope-less record must
    // come out scope-less — provisioning never claims a record's identity.
    const scopeless = {
      id: 9,
      email: "scopeless@example.com",
      appScope: null,
      passwordHash: "ORIGINAL_HASH",
      emailVerified: true,
    } as unknown as User;
    const userRepo = makeUserRepo([scopeless]);
    const { service } = makeService(userRepo);

    await (
      service as unknown as {
        provisionInvitedSeekerProfile: (u: User) => Promise<unknown>;
      }
    ).provisionInvitedSeekerProfile(scopeless);

    expect(scopeless.appScope).toBeNull();
    expect(scopeless.passwordHash).toBe("ORIGINAL_HASH");
  });

  it("resolveOrbitLoginUser must never return a non-orbit record", async () => {
    const customer = customerRecord();
    const userRepo = makeUserRepo([customer]);
    const { service } = makeService(userRepo);

    const resolve = (
      service as unknown as {
        resolveOrbitLoginUser: (e: string, t: AnnixOrbitUserType | null) => Promise<User | null>;
      }
    ).resolveOrbitLoginUser.bind(service);

    // No orbit record exists for this email — only a customer. Must be null,
    // never the customer record (which would let an Orbit login authenticate
    // against a Forge customer's credentials).
    expect(await resolve("shared.user@example.com", null)).toBeNull();
    expect(await resolve("shared.user@example.com", AnnixOrbitUserType.INDIVIDUAL)).toBeNull();

    // When an orbit-scoped record DOES exist, that is the one returned — a
    // DIFFERENT record from the customer.
    const orbitSeeker = {
      id: 2,
      email: "shared.user@example.com",
      appScope: ORBIT_SCOPE_BY_TYPE[AnnixOrbitUserType.INDIVIDUAL],
      passwordHash: "ORBIT_HASH",
    } as unknown as User;
    userRepo.rows.push(orbitSeeker);

    const resolved = await resolve("shared.user@example.com", AnnixOrbitUserType.INDIVIDUAL);
    expect(resolved?.id).toBe(2);
    expect(resolved?.appScope).toBe("orbit:seeker");
    expect(resolved?.id).not.toBe(customer.id);
  });

  it("assertOrbitAccountAvailable must not block on a non-orbit record", async () => {
    // A Forge customer exists for this email; an Orbit seeker registration for
    // the SAME email must still be allowed (no ConflictException), because the
    // two live as separate per-app records.
    const customer = customerRecord();
    const userRepo = makeUserRepo([customer]);
    const { service } = makeService(userRepo);

    const assertAvailable = (
      service as unknown as {
        assertOrbitAccountAvailable: (e: string, t: AnnixOrbitUserType) => Promise<void>;
      }
    ).assertOrbitAccountAvailable.bind(service);

    await expect(
      assertAvailable("shared.user@example.com", AnnixOrbitUserType.INDIVIDUAL),
    ).resolves.toBeUndefined();
  });
});
