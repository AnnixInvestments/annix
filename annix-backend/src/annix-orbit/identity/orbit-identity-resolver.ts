import { Injectable, Logger } from "@nestjs/common";
import { FEATURE_FLAGS } from "../../feature-flags/feature-flags.constants";
import { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import type { User } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import type { OrbitIdentity } from "./entities/orbit-identity.entity";
import { moduleForScope, ORBIT_MODULES, type OrbitModule, scopeForModule } from "./orbit-module";
import { IdentityRegistryRepository } from "./repositories/identity-registry.repository";
import { OrbitCompanyIdentityRepository } from "./repositories/orbit-company-identity.repository";
import type { OrbitIdentityRepository } from "./repositories/orbit-identity.repository";
import { OrbitRecruiterIdentityRepository } from "./repositories/orbit-recruiter-identity.repository";
import { OrbitSeekerIdentityRepository } from "./repositories/orbit-seeker-identity.repository";
import { OrbitStudentIdentityRepository } from "./repositories/orbit-student-identity.repository";

export interface OrbitLoginCandidate {
  module: OrbitModule;
  user: User;
}

function emailLowerOf(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Discovers the login candidate(s) for an email (ADR-0001 / S3 / M3). The login
 * service then password-matches them (password-first disambiguation).
 *
 * SAFETY INVARIANT: with ORBIT_IDENTITY_READ off (the default), this returns
 * exactly what today's `resolveOrbitLoginUser` returns — module-scoped, then the
 * single-row `findOrbitUserByEmail` fallback — i.e. at most ONE candidate, so the
 * multi-account 409 is impossible and flags-off login is byte-for-byte today.
 *
 * Only when READ is on (the migrated, module-isolated state) does it read the
 * per-module stores with NO cross-module fallback — structurally removing the
 * #389 bleed — and enable multi-candidate disambiguation.
 *
 * GUARD: READ on while DUAL_WRITE off is forbidden (reading new stores while not
 * keeping them current); it logs CRITICAL and forces the legacy read path.
 */
@Injectable()
export class OrbitIdentityResolver {
  private readonly logger = new Logger(OrbitIdentityResolver.name);
  private readonly repoByModule: Record<OrbitModule, OrbitIdentityRepository<OrbitIdentity>>;
  private readonly readFallbackCounts = new Map<OrbitModule, number>();

  constructor(
    private readonly userRepo: UserRepository,
    private readonly registry: IdentityRegistryRepository,
    private readonly flags: FeatureFlagsService,
    companyRepo: OrbitCompanyIdentityRepository,
    seekerRepo: OrbitSeekerIdentityRepository,
    recruiterRepo: OrbitRecruiterIdentityRepository,
    studentRepo: OrbitStudentIdentityRepository,
  ) {
    this.repoByModule = {
      company: companyRepo as unknown as OrbitIdentityRepository<OrbitIdentity>,
      seeker: seekerRepo as unknown as OrbitIdentityRepository<OrbitIdentity>,
      recruiter: recruiterRepo as unknown as OrbitIdentityRepository<OrbitIdentity>,
      student: studentRepo as unknown as OrbitIdentityRepository<OrbitIdentity>,
    };
  }

  /** Module-tagged count of identity-store reads that fell back to core `user`. */
  getReadFallbackCount(module: OrbitModule): number {
    return this.readFallbackCounts.get(module) ?? 0;
  }

  private incrementReadFallback(module: OrbitModule): void {
    this.readFallbackCounts.set(module, this.getReadFallbackCount(module) + 1);
    this.logger.warn(`orbit.identity.read_fallback module=${module}`);
  }

  private async effectiveReadEnabled(): Promise<boolean> {
    const readOn = await this.flags.isEnabled(FEATURE_FLAGS.ORBIT_IDENTITY_READ);
    if (!readOn) {
      return false;
    }
    const dualWriteOn = await this.flags.isEnabled(FEATURE_FLAGS.ORBIT_IDENTITY_DUAL_WRITE);
    if (!dualWriteOn) {
      this.logger.error(
        "CRITICAL: ORBIT_IDENTITY_READ is ON while ORBIT_IDENTITY_DUAL_WRITE is OFF — " +
          "forcing the legacy read path (never read-new while not dual-writing).",
      );
      return false;
    }
    return true;
  }

  /**
   * Byte-for-byte reproduction of today's `resolveOrbitLoginUser`: module-scoped
   * first, then the single-row `findOrbitUserByEmail` fallback. Returns ≤ 1
   * candidate (no disambiguation, no 409).
   */
  private async legacyCandidates(
    email: string,
    module: OrbitModule | null,
  ): Promise<OrbitLoginCandidate[]> {
    if (module) {
      const scoped = await this.userRepo.findOneByEmailAndScope(email, scopeForModule(module));
      if (scoped) {
        return [{ module, user: scoped }];
      }
    }
    const fallback = await this.userRepo.findOrbitUserByEmail(email);
    if (!fallback) {
      return [];
    }
    const resolvedModule = moduleForScope(fallback.appScope);
    return resolvedModule ? [{ module: resolvedModule, user: fallback }] : [];
  }

  /** Module-isolated read of the per-module store, with fallback to core `user`. */
  private async readIdentity(
    module: OrbitModule,
    email: string,
  ): Promise<OrbitLoginCandidate | null> {
    const identity = await this.repoByModule[module].findByEmailLower(emailLowerOf(email));
    if (identity) {
      // Hydrate the canonical user (id parity) so downstream login logic is
      // unchanged; the identity store served as the module-isolated discovery.
      const user = await this.userRepo.findById(identity.id as number);
      if (user) {
        return { module, user };
      }
    }
    // ADR M3 dual-read fallback to core `user` by scope.
    this.incrementReadFallback(module);
    const fallback = await this.userRepo.findOneByEmailAndScope(email, scopeForModule(module));
    return fallback ? { module, user: fallback } : null;
  }

  async resolveLoginCandidates(
    email: string,
    module: OrbitModule | null,
  ): Promise<OrbitLoginCandidate[]> {
    const readOn = await this.effectiveReadEnabled();

    if (!readOn) {
      return this.legacyCandidates(email, module);
    }

    if (module) {
      // Module specified → ONLY that module's store. Never another module's row.
      const candidate = await this.readIdentity(module, email);
      return candidate ? [candidate] : [];
    }

    // READ on, no module: fan-out via the registry to discover which modules this
    // email has, then read each module's isolated store.
    const refs = await this.registry.findByEmailLower(emailLowerOf(email));
    const candidates: OrbitLoginCandidate[] = [];
    const seen = new Set<OrbitModule>();
    for (const ref of refs) {
      const refModule = ref.module as OrbitModule;
      if (!ORBIT_MODULES.includes(refModule) || seen.has(refModule)) {
        continue;
      }
      seen.add(refModule);
      const candidate = await this.readIdentity(refModule, email);
      if (candidate) {
        candidates.push(candidate);
      }
    }

    if (candidates.length === 0) {
      // Registry not yet populated for this email — fall back to the legacy
      // single-row discovery so a mid-migration user is never locked out.
      return this.legacyCandidates(email, null);
    }

    return candidates;
  }
}
